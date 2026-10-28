/**
 * fit-selftest.mjs — known-answer test for src/lib/fit.ts on hand-built FIT and
 * ZIP files: both byte orders, a compressed-timestamp header, developer fields,
 * a rebound local type, invalid-position sentinels, a data-descriptor entry.
 * No network, no credentials.
 * Run: node scripts/fit-selftest.mjs   (exit 0 = pass)
 */
import { deflateRawSync, crc32 } from 'node:zlib';
import { unzipFit, parseFitActivity } from '../src/lib/fit.ts';

// byte builders

const u16 = (v, be = false) => (be ? [(v >> 8) & 0xff, v & 0xff] : [v & 0xff, (v >> 8) & 0xff]);
function u32(v, be = false) {
  const b = Buffer.alloc(4);
  if (be) b.writeUInt32BE(v >>> 0);
  else b.writeUInt32LE(v >>> 0);
  return [...b];
}
function s32(v, be = false) {
  const b = Buffer.alloc(4);
  if (be) b.writeInt32BE(v);
  else b.writeInt32LE(v);
  return [...b];
}

/** definition message; fields and dev fields as [num, size, base|index] */
function def(local, global, fields, { be = false, dev = [] } = {}) {
  return [
    0x40 | (dev.length ? 0x20 : 0) | local,
    0,
    be ? 1 : 0,
    ...u16(global, be),
    fields.length,
    ...fields.flat(),
    ...(dev.length ? [dev.length, ...dev.flat()] : [])
  ];
}
const data = (local, ...values) => [local, ...values.flat()];
const compressed = (local, offset, ...values) => [0x80 | (local << 5) | offset, ...values.flat()];

function fitFile(messages) {
  const body = messages.flat();
  const header = [14, 0x20, ...u16(2132), ...u32(body.length), 0x2e, 0x46, 0x49, 0x54, 0, 0];
  return Uint8Array.from([...header, ...body, 0, 0]); // trailing CRC, unchecked
}

const semi = (deg) => Math.round((deg * 2 ** 31) / 180);
const A = [12.9716, 77.5946];
const B = [12.972, 77.595];
const C = [12.9725, 77.5956];
const VO2 = 52.5; // exactly 983040 in 16.16 max-METs

const FIT = fitFile([
  def(0, 20, [
    [253, 4, 0x86],
    [0, 4, 0x85],
    [1, 4, 0x85]
  ]),
  data(0, u32(1000), s32(semi(A[0])), s32(semi(A[1]))),
  data(0, u32(1001), s32(0x7fffffff), s32(0x7fffffff)), // no fix
  data(0, u32(1002), s32(0), s32(0)), // null island
  def(
    1,
    20,
    [
      [0, 4, 0x85],
      [1, 4, 0x85]
    ],
    { be: true }
  ),
  compressed(1, 3, s32(semi(B[0]), true), s32(semi(B[1]), true)),
  def(
    2,
    3,
    [
      [1, 1, 0x00],
      [8, 1, 0x02]
    ],
    { dev: [[0, 3, 0]] }
  ),
  data(2, [1], [46], [0xaa, 0xbb, 0xcc]), // male, rhr 46, 3 developer bytes
  def(3, 140, [
    [4, 1, 0x02],
    [7, 4, 0x86]
  ]),
  data(3, [17], u32(Math.round((VO2 * 65536) / 3.5))),
  data(3, [0], u32(0)), // a later zero must not erase the estimate
  def(0, 21, [
    [0, 1, 0x00],
    [1, 1, 0x00]
  ]), // local 0 rebound to event
  data(0, [0], [4]),
  def(2, 20, [
    [0, 4, 0x88],
    [1, 4, 0x88]
  ]), // float-typed position: never read as an integer
  data(2, u32(0x41500000), u32(0x429b3333)),
  data(1, s32(semi(C[0]), true), s32(semi(C[1]), true))
]);

/** ZIP of [{ name, bytes, method, descriptor?, flags? }] plus an optional archive comment */
function zipOf(entries, comment = '') {
  const le16 = (v) => Buffer.from(u16(v));
  const le32 = (v) => Buffer.from(u32(v));
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name);
    const body = e.method === 8 ? deflateRawSync(e.bytes) : Buffer.from(e.bytes);
    const crc = crc32(e.bytes);
    const flags = (e.descriptor ? 0x08 : 0) | (e.flags ?? 0);
    const inHeader = (v) => le32(e.descriptor ? 0 : v);
    const local = Buffer.concat([
      le32(0x04034b50),
      le16(20),
      le16(flags),
      le16(e.method),
      le16(0),
      le16(0),
      inHeader(crc),
      inHeader(body.length),
      inHeader(e.bytes.length),
      le16(name.length),
      le16(0),
      name,
      body,
      ...(e.descriptor
        ? [le32(0x08074b50), le32(crc), le32(body.length), le32(e.bytes.length)]
        : [])
    ]);
    centrals.push(
      Buffer.concat([
        le32(0x02014b50),
        le16(20),
        le16(20),
        le16(flags),
        le16(e.method),
        le16(0),
        le16(0),
        le32(crc),
        le32(body.length),
        le32(e.bytes.length),
        le16(name.length),
        le16(0),
        le16(0),
        le16(0),
        le16(0),
        le32(0),
        le32(offset),
        name
      ])
    );
    locals.push(local);
    offset += local.length;
  }
  const cd = Buffer.concat(centrals);
  const note = Buffer.from(comment);
  const eocd = Buffer.concat([
    le32(0x06054b50),
    le16(0),
    le16(0),
    le16(entries.length),
    le16(entries.length),
    le32(cd.length),
    le32(offset),
    le16(note.length),
    note
  ]);
  return new Uint8Array(Buffer.concat([...locals, cd, eocd]));
}

// checks

let failed = false;
function check(name, actual, expected) {
  if (actual === expected) {
    console.log(`PASS  ${name}`);
  } else {
    failed = true;
    console.error(`FAIL  ${name}\n  expected: ${expected}\n  actual:   ${actual}`);
  }
}
function throws(name, fn, pattern) {
  try {
    fn();
    check(name, 'no error', `error matching ${pattern}`);
  } catch (e) {
    check(name, pattern.test(e.message), true);
  }
}
const near = (p, q) => Boolean(p) && Math.abs(p[0] - q[0]) < 1e-6 && Math.abs(p[1] - q[1]) < 1e-6;

const parsed = parseFitActivity(FIT);
check(
  'track keeps the three fixes, drops sentinel and null-island samples',
  parsed.track.length,
  3
);
check('LE record decodes to degrees', near(parsed.track[0], A), true);
check('BE record behind a compressed-timestamp header', near(parsed.track[1], B), true);
check('local type 1 still bound after local 0 was rebound', near(parsed.track[2], C), true);
check('user_profile gender past developer fields', parsed.gender, 'male');
check('message 140 max METs → VO2max, later zero ignored', parsed.vo2max, VO2);

const cut = parseFitActivity(FIT.subarray(0, FIT.length - 10));
check('truncated file keeps the whole messages before the cut', cut.track.length, 2);

// 255 zero-size fields, then a megabyte of one-byte messages: each must cost
// nothing, or a small hostile zip stalls the function for minutes
const zeroFields = Array.from({ length: 255 }, (_, i) => [i, 0, 0x02]);
const hostile = fitFile([def(0, 20, zeroFields), new Array(1 << 20).fill(0)]);
const t0 = performance.now();
const flat = parseFitActivity(hostile);
const ms = performance.now() - t0;
check(`zero-size fields skipped cheaply (${ms.toFixed(0)} ms for 1M messages)`, ms < 1000, true);
check('zero-size fields yield no points', flat.track.length, 0);
check(
  'a zero-size field does not shift the ones after it',
  near(
    parseFitActivity(
      fitFile([
        def(0, 20, [
          [253, 0, 0x86],
          [0, 4, 0x85],
          [1, 4, 0x85]
        ]),
        data(0, s32(semi(A[0])), s32(semi(A[1])))
      ])
    ).track[0],
    A
  ),
  true
);

throws('not a FIT file', () => parseFitActivity(Buffer.from('not a fit file at all')), /not a FIT/);
throws(
  'data message before any definition',
  () => parseFitActivity(fitFile([data(5, u32(0))])),
  /without a definition/
);

const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const deflated = zipOf(
  [
    { name: 'README.txt', bytes: Buffer.from('hello'), method: 0 },
    { name: '123_ACTIVITY.fit', bytes: FIT, method: 8, descriptor: true }
  ],
  'archive comment'
);
check(
  'deflated data-descriptor .fit entry, after a non-fit entry',
  same(unzipFit(deflated), FIT),
  true
);
check('stored entry', same(unzipFit(zipOf([{ name: 'x.FIT', bytes: FIT, method: 0 }])), FIT), true);
check(
  'no .fit name → first entry',
  same(unzipFit(zipOf([{ name: 'activity.bin', bytes: FIT, method: 8 }])), FIT),
  true
);
throws(
  'encrypted entry',
  () => unzipFit(zipOf([{ name: 'a.fit', bytes: FIT, method: 0, flags: 0x1 }])),
  /encrypted/
);
throws('not a zip', () => unzipFit(FIT), /end of central directory/);
check('zip → FIT end to end', parseFitActivity(unzipFit(deflated)).vo2max, VO2);

process.exit(failed ? 1 : 0);
