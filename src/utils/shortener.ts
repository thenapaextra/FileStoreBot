// ─── URL Shortener (port of shortner.py using fetch) ───

import { logger } from './logger';

function generateAlias(len = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const cache = new Map<string, string>();

export async function getShortUrl(
  url: string,
  shortUrl: string,
  shortApi: string,
  enabled: boolean
): Promise<string> {
  if (!enabled || !shortUrl || !shortApi || shortUrl.toLowerCase() === 'none') {
    return url;
  }

  const cached = cache.get(url);
  if (cached) return cached;

  try {
    const alias = generateAlias();
    const apiUrl = `https://${shortUrl}/api?api=${shortApi}&url=${encodeURIComponent(url)}&alias=${alias}`;
    const response = await fetch(apiUrl, { signal: AbortSignal.timeout(5000) });
    const data = await response.json() as any;

    if (data.status === 'success' && response.ok) {
      const shortened = data.shortenedUrl || url;
      cache.set(url, shortened);
      return shortened;
    }
  } catch (e: any) {
    logger.error('shortener', `Shortener error: ${e.message}`);
  }
  return url;
}

export async function testShortener(shortUrl: string, shortApi: string): Promise<{ success: boolean; result: string }> {
  try {
    const alias = generateAlias();
    const apiUrl = `https://${shortUrl}/api?api=${shortApi}&url=https://google.com&alias=${alias}`;
    const response = await fetch(apiUrl, { signal: AbortSignal.timeout(10000) });
    const data = await response.json() as any;

    if (data.status === 'success' && response.ok) {
      return { success: true, result: data.shortenedUrl || '' };
    }
    return { success: false, result: data.message || 'Unknown error' };
  } catch (e: any) {
    return { success: false, result: e.message };
  }
}
