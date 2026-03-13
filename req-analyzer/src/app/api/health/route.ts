export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL;

  return Response.json({
    hasApiKey: !!apiKey,
    keyPrefix: apiKey ? apiKey.substring(0, 12) + '...' : 'NOT SET',
    keyLength: apiKey?.length ?? 0,
    model: model || 'NOT SET (default: claude-haiku-4-5-20251001)',
    nodeEnv: process.env.NODE_ENV,
  });
}
