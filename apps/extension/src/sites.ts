const BLOCKED_HOSTS = ['linkedin.com', 'indeed.com'];

/** Job boards the extension must never touch, plus non-web pages. */
export function isBlockedPage(pageUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(pageUrl);
  } catch {
    return true;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return true;
  const host = url.hostname.toLowerCase();
  return BLOCKED_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}
