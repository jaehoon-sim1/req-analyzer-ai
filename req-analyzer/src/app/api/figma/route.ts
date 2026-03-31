import { NextRequest } from 'next/server';

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  characters?: string;
}

/** Figma 노드 트리에서 텍스트를 재귀적으로 추출 */
function extractTexts(node: FigmaNode, texts: string[]): void {
  // TEXT 노드: characters 필드에 텍스트 포함
  if (node.type === 'TEXT' && node.characters) {
    const trimmed = node.characters.trim();
    if (trimmed.length > 0) {
      texts.push(trimmed);
    }
  }

  // 프레임/그룹 이름이 의미 있는 경우 섹션 구분자로 사용
  if (
    node.children &&
    node.children.length > 0 &&
    ['FRAME', 'SECTION', 'COMPONENT', 'COMPONENT_SET'].includes(node.type) &&
    node.name &&
    !node.name.startsWith('Frame ') &&
    !node.name.startsWith('Group ')
  ) {
    texts.push(`\n[${node.name}]`);
  }

  if (node.children) {
    for (const child of node.children) {
      extractTexts(child, texts);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, fileKey, nodeId } = body;

    if (!token || typeof token !== 'string') {
      return Response.json({ error: 'Figma API 토큰이 필요합니다.' }, { status: 400 });
    }

    if (!fileKey || typeof fileKey !== 'string') {
      return Response.json({ error: 'Figma 파일 키가 필요합니다.' }, { status: 400 });
    }

    // Figma REST API 호출
    let url = `https://api.figma.com/v1/files/${fileKey}`;
    if (nodeId) {
      url += `?ids=${encodeURIComponent(nodeId)}`;
    }

    const figmaRes = await fetch(url, {
      headers: {
        'X-Figma-Token': token,
      },
    });

    if (!figmaRes.ok) {
      if (figmaRes.status === 403) {
        return Response.json(
          { error: 'Figma API 토큰이 유효하지 않거나 파일 접근 권한이 없습니다.' },
          { status: 403 }
        );
      }
      if (figmaRes.status === 404) {
        return Response.json(
          { error: 'Figma 파일을 찾을 수 없습니다. URL을 확인해주세요.' },
          { status: 404 }
        );
      }
      return Response.json(
        { error: `Figma API 오류: ${figmaRes.status} ${figmaRes.statusText}` },
        { status: figmaRes.status }
      );
    }

    const figmaData = await figmaRes.json();
    const document = figmaData.document;

    if (!document) {
      return Response.json({ error: 'Figma 파일 구조를 읽을 수 없습니다.' }, { status: 500 });
    }

    // 텍스트 추출
    const texts: string[] = [];

    // 파일 이름 추가
    if (figmaData.name) {
      texts.push(`# ${figmaData.name}`);
    }

    // 특정 노드가 지정된 경우 해당 노드들만 처리
    if (nodeId && figmaData.nodes) {
      for (const key of Object.keys(figmaData.nodes)) {
        const nodeData = figmaData.nodes[key];
        if (nodeData?.document) {
          extractTexts(nodeData.document, texts);
        }
      }
    } else {
      extractTexts(document, texts);
    }

    // 중복 제거 및 정리
    const uniqueTexts = [...new Set(texts)];
    const text = uniqueTexts.join('\n').replace(/\n{3,}/g, '\n\n').trim();

    // 노드 카운트
    let nodeCount = 0;
    function countNodes(node: FigmaNode) {
      nodeCount++;
      if (node.children) {
        for (const child of node.children) countNodes(child);
      }
    }
    if (nodeId && figmaData.nodes) {
      for (const key of Object.keys(figmaData.nodes)) {
        const nodeData = figmaData.nodes[key];
        if (nodeData?.document) countNodes(nodeData.document);
      }
    } else {
      countNodes(document);
    }

    return Response.json({
      text,
      fileName: figmaData.name || fileKey,
      nodeCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Figma 처리 중 오류가 발생했습니다.';
    return Response.json({ error: message }, { status: 500 });
  }
}
