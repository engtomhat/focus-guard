// The self-contained promise: Focus Guard never talks to any server. This finds
// anything in source or built code that could: network APIs, and URLs other
// than the few that are only ever opened by the user clicking a link.

/** URLs that may appear: links the user clicks, and XML namespaces (not fetched) */
export const ALLOWED_URLS = [
  'https://www.buymeacoffee.com/tomhat',
  'http://www.w3.org/2000/svg',
];

const NETWORK_APIS: [string, RegExp][] = [
  ['fetch()', /\bfetch\s*\(/],
  ['XMLHttpRequest', /\bXMLHttpRequest\b/],
  ['WebSocket', /\bWebSocket\b/],
  ['EventSource', /\bEventSource\b/],
  ['sendBeacon', /\bsendBeacon\b/],
  ['importScripts', /\bimportScripts\b/],
  ['RTCPeerConnection', /\bRTCPeerConnection\b/],
];

// Remote (http/https/ws/wss) and local-machine addresses
const URL_PATTERN = /\b(?:https?|wss?):\/\/[^\s"'`)<>]+/gi;
const LOCAL_ADDRESS = /\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0)\b|\[::1\]/i;

export function findNetworkAccess(code: string): string[] {
  const findings = NETWORK_APIS.filter(([, pattern]) => pattern.test(code)).map(([name]) => name);
  for (const url of code.match(URL_PATTERN) ?? []) {
    // `http://${input}` builds a URL object to parse user input; it names no server
    // (actual requests are caught by the network API checks above)
    if (/^\w+:\/\/\$\{/.test(url)) {
      continue;
    }
    if (!ALLOWED_URLS.some(allowed => url === allowed || url.startsWith(`${allowed}/`))) {
      findings.push(url);
    }
  }
  const local = code.match(LOCAL_ADDRESS);
  if (local) {
    findings.push(local[0]);
  }
  return findings;
}

/** Remove line and block comments (examples in comments aren't code). Keeps "https://" in strings. */
export function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1")
}
