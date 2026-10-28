/**
 * Just enough ZIP and FIT decoding for Garmin's original-file download: the
 * GPS track, the VO2max estimate and the profile's sex. Everything else in the
 * file is skipped by size without being decoded.
 * Must stay environment-agnostic and erasable-TS-only (node type stripping
 * imports this file directly, see scripts/fit-selftest.mjs).
 */
import { inflateRawSync } from 'node:zlib';

export interface FitActivity {
  /** [lat, lon] in degrees, recording order; samples without a fix are skipped */
  track: Array<[number, number]>;
  /** ml/kg/min, unrounded, from the last message 140 that carries one */
  vo2max: number | null;
  /** user_profile.gender */
  gender: 'male' | 'female' | null;
}

function view(b: Uint8Array): DataView {
  return new DataView(b.buffer, b.byteOffset, b.byteLength);
}

// ZIP (PKWARE APPNOTE): end of central directory → central directory → local
// header. The central directory is the reliable source of sizes: entries
// written with a data descriptor (flag bit 3) carry zeros in the local header.

const EOCD_SIG = 0x06054b50;
const CENTRAL_SIG = 0x02014b50;
const LOCAL_SIG = 0x04034b50;
/** an activity file is a few MB at most; a cap keeps a hostile archive from ballooning */
const MAX_UNZIPPED_BYTES = 64 * 1024 * 1024;

/** Bytes of the archive's .fit entry (or its first entry when none is named .fit). */
export function unzipFit(zip: Uint8Array): Uint8Array {
  const dv = view(zip);

  // EOCD is 22 bytes followed by a comment of at most 0xffff bytes
  let eocd = -1;
  for (let i = zip.length - 22; i >= 0 && i >= zip.length - 22 - 0xffff; i--) {
    if (dv.getUint32(i, true) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('FIT zip: end of central directory not found');

  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  let entry: {
    flags: number;
    method: number;
    compressed: number;
    size: number;
    local: number;
  } | null = null;
  for (let n = 0; n < count; n++) {
    if (p + 46 > zip.length || dv.getUint32(p, true) !== CENTRAL_SIG) {
      throw new Error('FIT zip: malformed central directory');
    }
    const nameLen = dv.getUint16(p + 28, true);
    const name = new TextDecoder().decode(zip.subarray(p + 46, p + 46 + nameLen));
    const candidate = {
      flags: dv.getUint16(p + 8, true),
      method: dv.getUint16(p + 10, true),
      compressed: dv.getUint32(p + 20, true),
      size: dv.getUint32(p + 24, true),
      local: dv.getUint32(p + 42, true)
    };
    if (/\.fit$/i.test(name)) {
      entry = candidate;
      break;
    }
    entry ??= candidate;
    p += 46 + nameLen + dv.getUint16(p + 30, true) + dv.getUint16(p + 32, true);
  }
  if (!entry) throw new Error('FIT zip: archive is empty');
  if (entry.flags & 0x1) throw new Error('FIT zip: entry is encrypted');

  const { local } = entry;
  if (local + 30 > zip.length || dv.getUint32(local, true) !== LOCAL_SIG) {
    throw new Error('FIT zip: malformed local header');
  }
  const start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
  if (start + entry.compressed > zip.length)
    throw new Error('FIT zip: entry runs past the archive');
  const data = zip.subarray(start, start + entry.compressed);

  if (entry.method === 0) return data;
  if (entry.method === 8) return inflateRawSync(data, { maxOutputLength: MAX_UNZIPPED_BYTES });
  throw new Error(`FIT zip: unsupported compression method ${entry.method}`);
}

// FIT protocol 2.0: a 12- or 14-byte header, then a stream of definition and
// data messages. A definition binds a local type (0-15) to a global message
// number and a field layout; every data message after it with that local type
// is laid out that way, until a later definition rebinds the local type.

const MESG_USER_PROFILE = 3;
const MESG_RECORD = 20;
/**
 * Not in the FIT SDK profile. Field 7 reads as max METs in 16.16 fixed point,
 * and one MET is 3.5 ml/kg/min. Garmin writes one per activity; sports without
 * an estimate write 0.
 */
const MESG_PHYSIOLOGICAL = 140;

const SEMICIRCLES_TO_DEGREES = 180 / 2 ** 31;
const INVALID_SINT32 = 0x7fffffff;
const INVALID_UINT32 = 0xffffffff;

interface FieldDef {
  num: number;
  size: number;
  base: number;
}

interface MesgDef {
  global: number;
  littleEndian: boolean;
  fields: FieldDef[];
  /** bytes per data message, developer fields included */
  size: number;
}

/** integer base types by their low five bits; floats, strings and bytes are never read */
const UNSIGNED_BASES = new Set([0, 2, 4, 6, 10, 11, 12]);
const SIGNED_BASES = new Set([1, 3, 5]);

/** The requested integer fields of one data message, raw — invalid sentinels included. */
function readFields(dv: DataView, at: number, def: MesgDef, nums: number[]): Map<number, number> {
  const out = new Map<number, number>();
  let off = at;
  for (const f of def.fields) {
    const base = f.base & 0x1f;
    const signed = SIGNED_BASES.has(base);
    if (nums.includes(f.num) && (signed || UNSIGNED_BASES.has(base))) {
      const le = def.littleEndian;
      if (f.size === 1) out.set(f.num, signed ? dv.getInt8(off) : dv.getUint8(off));
      else if (f.size === 2) out.set(f.num, signed ? dv.getInt16(off, le) : dv.getUint16(off, le));
      else if (f.size === 4) out.set(f.num, signed ? dv.getInt32(off, le) : dv.getUint32(off, le));
    }
    off += f.size;
  }
  return out;
}

/** Track, VO2max and sex from a FIT activity file. Throws on anything that isn't one. */
export function parseFitActivity(fit: Uint8Array): FitActivity {
  if (fit.length < 12) throw new Error('FIT: file too short');
  const dv = view(fit);
  const headerSize = fit[0];
  const signature = String.fromCharCode(fit[8], fit[9], fit[10], fit[11]);
  if ((headerSize !== 12 && headerSize !== 14) || signature !== '.FIT') {
    throw new Error('FIT: not a FIT file');
  }
  // a truncated download still yields every message that arrived whole
  const end = Math.min(fit.length, headerSize + dv.getUint32(4, true));

  const out: FitActivity = { track: [], vo2max: null, gender: null };
  const defs = new Map<number, MesgDef>();
  let p = headerSize;

  while (p < end) {
    const header = fit[p++];

    // normal header with bit 6 set: a definition message
    if ((header & 0x80) === 0 && (header & 0x40) !== 0) {
      if (p + 5 > end) break;
      const littleEndian = fit[p + 1] === 0;
      const global = dv.getUint16(p + 2, littleEndian);
      const fieldCount = fit[p + 4];
      p += 5;
      if (p + fieldCount * 3 > end) break;
      const fields: FieldDef[] = [];
      let size = 0;
      for (let i = 0; i < fieldCount; i++, p += 3) {
        // a zero-size field holds nothing, and kept around it makes every one-byte
        // message walk the whole list — a hostile 65 KB zip then parses for minutes
        if (fit[p + 1] > 0) fields.push({ num: fit[p], size: fit[p + 1], base: fit[p + 2] });
        size += fit[p + 1];
      }
      // developer fields: only their sizes matter, to step over them
      if (header & 0x20) {
        if (p + 1 > end) break;
        const devCount = fit[p++];
        if (p + devCount * 3 > end) break;
        for (let i = 0; i < devCount; i++, p += 3) size += fit[p + 1];
      }
      defs.set(header & 0x0f, { global, littleEndian, fields, size });
      continue;
    }

    // a data message: compressed-timestamp headers keep the local type in bits 5-6
    const def = defs.get(header & 0x80 ? (header >> 5) & 0x03 : header & 0x0f);
    if (!def) throw new Error('FIT: data message without a definition');
    if (p + def.size > end) break;

    if (def.fields.length === 0) {
      // nothing to read
    } else if (def.global === MESG_RECORD) {
      const v = readFields(dv, p, def, [0, 1]);
      const lat = v.get(0);
      const lon = v.get(1);
      if (
        lat !== undefined &&
        lon !== undefined &&
        lat !== INVALID_SINT32 &&
        lon !== INVALID_SINT32 &&
        (lat !== 0 || lon !== 0)
      ) {
        const latDeg = lat * SEMICIRCLES_TO_DEGREES;
        const lonDeg = lon * SEMICIRCLES_TO_DEGREES;
        if (Math.abs(latDeg) <= 90 && Math.abs(lonDeg) <= 180) out.track.push([latDeg, lonDeg]);
      }
    } else if (def.global === MESG_USER_PROFILE) {
      const g = readFields(dv, p, def, [1]).get(1);
      if (g === 0) out.gender = 'female';
      else if (g === 1) out.gender = 'male';
    } else if (def.global === MESG_PHYSIOLOGICAL) {
      const maxMet = readFields(dv, p, def, [7]).get(7);
      if (maxMet !== undefined && maxMet !== INVALID_UINT32) {
        const vo2 = (maxMet / 65536) * 3.5;
        if (vo2 >= 10 && vo2 <= 100) out.vo2max = vo2;
      }
    }

    p += def.size;
  }

  return out;
}
