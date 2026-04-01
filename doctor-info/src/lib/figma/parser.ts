// Figma REST API 파서
// 텍스트, 컴포넌트, 페이지 구조를 추출하여 지식으로 변환

export interface FigmaFileInfo {
  fileKey: string;
  title: string;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  characters?: string;        // 텍스트 내용
  children?: FigmaNode[];
  description?: string;       // 컴포넌트 설명
}

export interface FigmaPage {
  name: string;
  frames: FigmaFrame[];
  texts: string[];
  components: string[];
}

export interface FigmaFrame {
  id: string;
  name: string;
}

// Figma URL에서 파일 키 추출
export function extractFigmaFileKey(url: string): string | null {
  // https://www.figma.com/file/KEY/title
  // https://www.figma.com/design/KEY/title
  const match = url.match(/figma\.com\/(?:file|design)\/([A-Za-z0-9]+)/);
  return match ? match[1] : null;
}

// Figma API 호출
async function fetchFigmaAPI(path: string, token: string) {
  const response = await fetch(`https://api.figma.com/v1${path}`, {
    headers: { 'X-Figma-Token': token },
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Figma API 오류 (${response.status}): ${error}`);
  }
  return response.json();
}

// 노드에서 텍스트 재귀 추출
function extractTexts(node: FigmaNode, texts: Set<string>) {
  if (node.type === 'TEXT' && node.characters?.trim()) {
    texts.add(node.characters.trim());
  }
  if (node.children) {
    for (const child of node.children) {
      extractTexts(child, texts);
    }
  }
}

// 컴포넌트 이름 재귀 추출
function extractComponents(node: FigmaNode, components: Set<string>) {
  if (
    (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') &&
    node.name
  ) {
    const entry = node.description
      ? `${node.name}: ${node.description}`
      : node.name;
    components.add(entry);
  }
  if (node.children) {
    for (const child of node.children) {
      extractComponents(child, components);
    }
  }
}

// 프레임 목록 추출 (1단계 깊이)
function extractFrames(node: FigmaNode): FigmaFrame[] {
  const frames: FigmaFrame[] = [];
  if (node.children) {
    for (const child of node.children) {
      if (child.type === 'FRAME' || child.type === 'SECTION') {
        frames.push({ id: child.id, name: child.name });
      }
    }
  }
  return frames;
}

// Figma 파일 전체 파싱 → 텍스트 문서 생성
export async function parseFigmaFile(
  fileKey: string,
  token: string
): Promise<{ title: string; content: string; pages: FigmaPage[] }> {
  const data = await fetchFigmaAPI(`/files/${fileKey}`, token);

  const fileTitle: string = data.name || 'Figma 파일';
  const pages: FigmaPage[] = [];

  for (const page of data.document?.children || []) {
    const texts = new Set<string>();
    const components = new Set<string>();
    const frames = extractFrames(page);

    extractTexts(page, texts);
    extractComponents(page, components);

    pages.push({
      name: page.name,
      frames,
      texts: [...texts],
      components: [...components],
    });
  }

  // 전체 내용을 하나의 문서로 합치기
  const sections: string[] = [];

  sections.push(`# ${fileTitle}\n`);
  sections.push(`Figma 파일 키: ${fileKey}\n`);

  for (const page of pages) {
    sections.push(`\n## 페이지: ${page.name}`);

    if (page.frames.length > 0) {
      sections.push(
        `### 화면 목록\n${page.frames.map(f => `- ${f.name}`).join('\n')}`
      );
    }

    if (page.components.length > 0) {
      sections.push(
        `### 컴포넌트\n${page.components.map(c => `- ${c}`).join('\n')}`
      );
    }

    if (page.texts.length > 0) {
      // 중복 제거, 너무 긴 텍스트 제한
      const uniqueTexts = [...new Set(page.texts)]
        .filter(t => t.length > 1 && t.length < 500)
        .slice(0, 200);
      sections.push(
        `### 텍스트 내용\n${uniqueTexts.map(t => `- ${t}`).join('\n')}`
      );
    }
  }

  return {
    title: fileTitle,
    content: sections.join('\n'),
    pages,
  };
}

// 주요 프레임 이미지 URL 가져오기 (Claude Vision 분석용)
export async function getFigmaFrameImages(
  fileKey: string,
  frameIds: string[],
  token: string
): Promise<Record<string, string>> {
  if (frameIds.length === 0) return {};

  const ids = frameIds.slice(0, 10).join(','); // 최대 10개
  const data = await fetchFigmaAPI(
    `/images/${fileKey}?ids=${ids}&format=png&scale=1`,
    token
  );
  return data.images || {};
}
