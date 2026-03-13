import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다. .env.local 파일에 ANTHROPIC_API_KEY를 추가하세요.'
      );
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

// Default export for backward compatibility
const anthropic = {
  get messages() {
    return getAnthropicClient().messages;
  },
};

export default anthropic;
