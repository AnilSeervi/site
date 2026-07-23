/**
 * OAuth1 HMAC-SHA1 signing self-test — RFC 5849 known-answer example.
 *
 * Verifies src/lib/garmin-core.ts `oauth1Sign` against the example request in
 * RFC 5849 §3.4.1.1 (as corrected by Errata ID 2550):
 *
 *   POST http://example.com/request?b5=%3D%253D&a3=a&c%40=&a2=r%20b
 *   body: c2&a3=2+q
 *   client j49sk3j29djd / token secret dh893hdasih9
 *   → signature "r6/TJjbCOr97/+UU0NsvSne7s5g="
 *
 * Run:  node scripts/garmin-oauth-selftest.mjs   (exit 0 = pass)
 */
import { oauth1Sign, percentEncode } from '../src/lib/garmin-core.ts';

const EXPECTED_BASE_STRING =
  'POST&http%3A%2F%2Fexample.com%2Frequest&a2%3Dr%2520b%26a3%3D2%2520q%26a3%3Da' +
  '%26b5%3D%253D%25253D%26c%2540%3D%26c2%3D%26oauth_consumer_key%3D9djdj82h48djs9d2' +
  '%26oauth_nonce%3D7d8f3e4a%26oauth_signature_method%3DHMAC-SHA1' +
  '%26oauth_timestamp%3D137131201%26oauth_token%3Dkkk9d7dh3k39sjv7';

const EXPECTED_SIGNATURE = 'r6/TJjbCOr97/+UU0NsvSne7s5g=';

const result = oauth1Sign({
  method: 'POST',
  url: 'http://example.com/request?b5=%3D%253D&a3=a&c%40=&a2=r%20b',
  consumerKey: '9djdj82h48djs9d2',
  consumerSecret: 'j49sk3j29djd',
  token: 'kkk9d7dh3k39sjv7',
  tokenSecret: 'dh893hdasih9',
  bodyParams: { c2: '', a3: '2 q' },
  timestamp: '137131201',
  nonce: '7d8f3e4a',
  includeVersion: false // the RFC example omits oauth_version
});

let failed = false;
function check(name, actual, expected) {
  if (actual === expected) {
    console.log(`PASS  ${name}`);
  } else {
    failed = true;
    console.error(`FAIL  ${name}\n  expected: ${expected}\n  actual:   ${actual}`);
  }
}

check('signature base string (RFC 5849 §3.4.1.1 + Errata 2550)', result.baseString, EXPECTED_BASE_STRING);
check('HMAC-SHA1 signature (RFC 5849 §3.4.2)', result.signature, EXPECTED_SIGNATURE);

// percent-encoding edge cases (RFC 3986 unreserved set only)
check('percentEncode("r b")', percentEncode('r b'), 'r%20b');
check('percentEncode("=%3D")', percentEncode('=%3D'), '%3D%253D');
check(`percentEncode("!'()*")`, percentEncode("!'()*"), '%21%27%28%29%2A');
check('percentEncode("~-._")', percentEncode('~-._'), '~-._');

// Authorization header shape (deterministic inputs → stable header)
const headerOk =
  result.header.startsWith('OAuth ') &&
  result.header.includes('oauth_signature="r6%2FTJjbCOr97%2F%2BUU0NsvSne7s5g%3D"') &&
  result.header.includes('oauth_consumer_key="9djdj82h48djs9d2"') &&
  !result.header.includes('oauth_version'); // omitted via includeVersion:false
check('Authorization header format', headerOk, true);

process.exit(failed ? 1 : 0);
