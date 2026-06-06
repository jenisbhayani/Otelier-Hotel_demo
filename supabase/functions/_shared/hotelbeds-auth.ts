/**
 * Hotelbeds APItude authentication — only used server-side in Edge Functions.
 * X-Signature = SHA256(apiKey + secret + unixTimestampSeconds) as hex
 */
export async function buildHotelbedsHeaders(
  apiKey: string,
  secret: string,
): Promise<Record<string, string>> {
  const timestamp = Math.floor(Date.now() / 1000)
  const payload = `${apiKey}${secret}${timestamp}`
  const encoded = new TextEncoder().encode(payload)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
  const signature = Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Api-key': apiKey,
    'X-Signature': signature,
  }
}
