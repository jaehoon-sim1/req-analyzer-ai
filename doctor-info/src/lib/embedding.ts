const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';
const VOYAGE_MODEL = 'voyage-3';

export async function createEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error('VOYAGE_API_KEY가 설정되지 않았습니다.');
  }

  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input: text,
      input_type: 'document',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Voyage AI 임베딩 실패: ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

export async function createQueryEmbedding(query: string): Promise<number[]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error('VOYAGE_API_KEY가 설정되지 않았습니다.');
  }

  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input: query,
      input_type: 'query',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Voyage AI 임베딩 실패: ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}
