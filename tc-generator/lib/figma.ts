export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  characters?: string;
  children?: FigmaNode[];
}

export interface FigmaFrameGroup {
  frameName: string;
  texts: string[];
}

export interface FigmaExtractResult {
  pageName: string;
  frames: FigmaFrameGroup[];
  texts: string[];
  nodeCount: number;
}

/**
 * Figma URL에서 fileKey와 nodeId를 추출
 * 지원 형식:
 *   https://www.figma.com/design/:fileKey/:name?node-id=X-Y
 *   https://www.figma.com/file/:fileKey/:name?node-id=X-Y
 */
export function parseFigmaUrl(
  url: string
): { fileKey: string; nodeId: string } | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("figma.com")) return null;

    // /design/:fileKey/... 또는 /file/:fileKey/...
    const match = parsed.pathname.match(/\/(design|file)\/([a-zA-Z0-9]+)/);
    if (!match) return null;

    const fileKey = match[2];
    const nodeIdParam = parsed.searchParams.get("node-id");
    if (!nodeIdParam) return null;

    // URL의 X-Y 형식을 Figma API의 X:Y 형식으로 변환
    const nodeId = nodeIdParam.replace(/-/g, ":");

    return { fileKey, nodeId };
  } catch {
    return null;
  }
}

/**
 * Figma 노드 트리에서 텍스트를 재귀적으로 추출 (하위 호환용)
 */
export function extractTextFromNodes(node: FigmaNode): string[] {
  const texts: string[] = [];

  if (
    node.type === "FRAME" ||
    node.type === "COMPONENT" ||
    node.type === "INSTANCE"
  ) {
    texts.push(`[${node.type}] ${node.name}`);
  }

  if (node.type === "TEXT" && node.characters) {
    texts.push(node.characters);
  }

  if (node.children) {
    for (const child of node.children) {
      texts.push(...extractTextFromNodes(child));
    }
  }

  return texts;
}

/**
 * Figma 노드 트리에서 프레임명 기준으로 그룹핑하여 추출
 * 최상위 FRAME/COMPONENT/INSTANCE를 기준으로 내부 TEXT를 수집
 */
export function extractFrameGroups(node: FigmaNode): FigmaFrameGroup[] {
  const groups: FigmaFrameGroup[] = [];

  // 현재 노드가 프레임이면 내부 텍스트를 모두 수집
  if (
    node.type === "FRAME" ||
    node.type === "COMPONENT" ||
    node.type === "INSTANCE"
  ) {
    const texts = collectTextsRecursive(node);
    if (texts.length > 0) {
      groups.push({ frameName: node.name, texts });
    }

    // 자식 프레임도 독립적으로 그룹핑 (중첩 프레임 지원)
    if (node.children) {
      for (const child of node.children) {
        if (
          child.type === "FRAME" ||
          child.type === "COMPONENT" ||
          child.type === "INSTANCE"
        ) {
          groups.push(...extractFrameGroups(child));
        }
      }
    }
  } else if (node.children) {
    // 페이지 등 상위 노드에서 자식 탐색
    for (const child of node.children) {
      groups.push(...extractFrameGroups(child));
    }
  }

  return groups;
}

/**
 * 노드 하위의 모든 TEXT를 재귀적으로 수집
 */
function collectTextsRecursive(node: FigmaNode): string[] {
  const texts: string[] = [];

  if (node.type === "TEXT" && node.characters) {
    texts.push(node.characters);
  }

  if (node.children) {
    for (const child of node.children) {
      texts.push(...collectTextsRecursive(child));
    }
  }

  return texts;
}
