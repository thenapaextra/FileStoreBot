// ─── URL-safe Base64 encode/decode (mirrors helper_func.py) ───

export function encode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  const base64 = btoa(String.fromCharCode(...bytes));
  // Make URL-safe and strip padding
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decode(base64Str: string): string {
  // Restore padding
  let padded = base64Str.replace(/-/g, '+').replace(/_/g, '/');
  const mod = padded.length % 4;
  if (mod) padded += '='.repeat(4 - mod);
  const binary = atob(padded);
  const bytes = new Uint8Array([...binary].map(c => c.charCodeAt(0)));
  return new TextDecoder().decode(bytes);
}
