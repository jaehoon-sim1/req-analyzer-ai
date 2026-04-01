const CHUNK_SIZE = 512;
const CHUNK_OVERLAP = 50;

export interface TextChunk {
  content: string;
  index: number;
}

export function chunkText(text: string): TextChunk[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: TextChunk[] = [];

  if (words.length <= CHUNK_SIZE) {
    return [{ content: words.join(' '), index: 0 }];
  }

  let start = 0;
  let index = 0;

  while (start < words.length) {
    const end = Math.min(start + CHUNK_SIZE, words.length);
    const chunk = words.slice(start, end).join(' ');
    chunks.push({ content: chunk, index });

    start += CHUNK_SIZE - CHUNK_OVERLAP;
    index++;
  }

  return chunks;
}
