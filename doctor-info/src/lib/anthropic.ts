import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'sk-ant-your-key') {
      throw new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다.');
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export const CHAT_MODEL = 'claude-haiku-4-5-20251001';
