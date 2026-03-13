export async function parseTXT(buffer: Buffer): Promise<string> {
  return buffer.toString('utf-8');
}
