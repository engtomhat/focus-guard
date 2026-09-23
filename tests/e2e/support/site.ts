// A tiny local web server standing in for real websites.
// Every hostname the tests use (blocked.test, fine.test, ...) resolves to it.
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

export const HOSTS = ['blocked.test', 'fine.test', 'host.test', 'other.test', 'late.test', 'start.test', 'reddit.test', 'facebook.test'];

export interface TestSite {
  port: number;
  url: (host: string, path?: string) => string;
  /** Requests the site received, as "host/path" */
  requests: string[];
  close: () => Promise<void>;
}

export async function startSite(): Promise<TestSite> {
  const requests: string[] = [];
  let port = 0;
  const server: Server = createServer((req, res) => {
    const path = (req.url ?? '/').split('?')[0];
    requests.push(`${req.headers.host}${path}`);
    const body = path === '/embed.html'
      // A page embedding a blocked domain in an iframe
      ? `<!doctype html><title>embed</title><iframe id="frame" src="http://blocked.test:${port}/"></iframe>`
      : `<!doctype html><title>${req.headers.host}</title><h1>${req.headers.host}</h1>`;
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(body);
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  port = (server.address() as AddressInfo).port;
  return {
    port,
    url: (host, path = '/') => `http://${host}:${port}${path}`,
    requests,
    close: () => new Promise(resolve => server.close(() => resolve())),
  };
}

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
