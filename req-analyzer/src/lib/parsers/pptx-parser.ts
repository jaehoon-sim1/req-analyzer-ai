import JSZip from 'jszip';

/**
 * PPTX 파일에서 슬라이드별 텍스트를 추출합니다.
 * PPTX는 ZIP 내부의 XML 파일로 구성되어 있으며,
 * ppt/slides/slide{N}.xml에서 <a:t> 태그의 텍스트를 추출합니다.
 */
export async function parsePPTX(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);

  // Find all slide files and sort by slide number
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0');
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0');
      return numA - numB;
    });

  const slides: string[] = [];

  for (const filename of slideFiles) {
    const xml = await zip.files[filename].async('string');
    const slideNum = filename.match(/slide(\d+)/)?.[1] || '?';

    // Extract all <a:t>...</a:t> text nodes
    const textMatches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g);
    if (!textMatches || textMatches.length === 0) continue;

    const texts = textMatches
      .map((match) => {
        const content = match.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, '');
        return decodeXmlEntities(content);
      })
      .filter((t) => t.trim().length > 0);

    if (texts.length > 0) {
      // Group texts by paragraph (<a:p>) boundaries
      const paragraphs = extractParagraphs(xml);
      slides.push(`[슬라이드 ${slideNum}]\n${paragraphs}`);
    }
  }

  if (slides.length === 0) {
    return 'PPTX 파일에서 텍스트를 추출할 수 없습니다.';
  }

  return slides.join('\n\n');
}

function extractParagraphs(xml: string): string {
  const lines: string[] = [];

  // Split by <a:p> paragraph tags
  const paragraphs = xml.split(/<a:p[ >]/);

  for (const para of paragraphs) {
    // Extract all <a:t> within this paragraph
    const textMatches = para.match(/<a:t[^>]*>([^<]*)<\/a:t>/g);
    if (!textMatches) continue;

    const lineText = textMatches
      .map((match) => {
        const content = match.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, '');
        return decodeXmlEntities(content);
      })
      .join('');

    if (lineText.trim()) {
      lines.push(lineText.trim());
    }
  }

  return lines.join('\n');
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec)));
}
