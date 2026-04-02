"use client";

import { useState, useEffect, useCallback } from "react";
import {
  parseFigmaUrl,
  extractTextFromNodes,
  extractFrameGroups,
  FigmaNode,
} from "@/lib/figma";

interface FigmaFrame {
  frameName: string;
  texts: string[];
}

interface Props {
  onGenerate: (data: { figmaText: string }) => void;
  isLoading: boolean;
}

export default function FigmaInput({ onGenerate, isLoading }: Props) {
  const [figmaToken, setFigmaToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [figmaUrl, setFigmaUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedTexts, setExtractedTexts] = useState<string[] | null>(null);
  const [extractedFrames, setExtractedFrames] = useState<FigmaFrame[] | null>(
    null
  );
  const [pageName, setPageName] = useState("");
  const [extractError, setExtractError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("figma_access_token");
    if (saved) setFigmaToken(saved);
    const savedUrl = localStorage.getItem("figma_last_url");
    if (savedUrl) setFigmaUrl(savedUrl);
  }, []);

  const handleTokenChange = (token: string) => {
    setFigmaToken(token);
    localStorage.setItem("figma_access_token", token);
  };

  const handleUrlChange = (url: string) => {
    setFigmaUrl(url);
    localStorage.setItem("figma_last_url", url);
  };

  const handleExtract = useCallback(async () => {
    setExtractError("");
    setExtractedTexts(null);
    setExtractedFrames(null);

    if (!figmaToken.trim()) {
      setExtractError("Figma 액세스 토큰을 먼저 입력해주세요.");
      return;
    }

    // 클라이언트 사이드 URL 검증
    const parsed = parseFigmaUrl(figmaUrl);
    if (!parsed) {
      setExtractError(
        "올바른 Figma 페이지 URL을 입력해주세요.\n예: https://www.figma.com/design/xxxxx/Name?node-id=0-1"
      );
      return;
    }

    setIsExtracting(true);

    try {
      const { fileKey, nodeId } = parsed;

      // 클라이언트에서 직접 Figma API 호출 (Vercel 서버 IP rate limit 우회)
      const res = await fetch(
        `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`,
        {
          headers: { "X-Figma-Token": figmaToken },
        }
      );

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error(
            "Figma API 요청 제한 초과 (Rate Limit). 1~2분 후 다시 시도해주세요."
          );
        }
        if (res.status === 403) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = String(errData?.message || errData?.err || "");
          if (errMsg.toLowerCase().includes("rate limit")) {
            throw new Error(
              "Figma API 요청 제한 초과. 1~2분 후 다시 시도해주세요."
            );
          }
          throw new Error(
            "Figma 액세스 토큰이 유효하지 않거나 파일 접근 권한이 없습니다.\n토큰을 다시 확인해주세요."
          );
        }
        if (res.status === 404) {
          throw new Error("Figma 파일을 찾을 수 없습니다. URL을 확인해주세요.");
        }
        throw new Error(`Figma API 오류 (${res.status})`);
      }

      const data = await res.json();
      const nodeData = data.nodes?.[nodeId];

      if (!nodeData?.document) {
        throw new Error(
          "해당 노드를 찾을 수 없습니다. URL의 node-id를 확인해주세요."
        );
      }

      const document = nodeData.document as FigmaNode;
      const texts = extractTextFromNodes(document);
      const frames = extractFrameGroups(document);

      if (texts.length === 0 && frames.length === 0) {
        throw new Error(
          "해당 페이지에서 텍스트를 추출할 수 없습니다. 텍스트 레이어가 포함된 페이지를 선택해주세요."
        );
      }

      setExtractedTexts(texts);
      setExtractedFrames(frames.length > 0 ? frames : null);
      setPageName(document.name);
    } catch (err) {
      setExtractError(
        err instanceof Error ? err.message : "Figma 추출 중 오류 발생"
      );
    } finally {
      setIsExtracting(false);
    }
  }, [figmaUrl, figmaToken]);

  // 프레임 기반 포맷 (프레임별로 텍스트를 그룹핑)
  const formattedText = extractedFrames?.length
    ? extractedFrames
        .map(
          (f) => `[프레임: ${f.frameName}]\n${f.texts.join("\n")}`
        )
        .join("\n\n")
    : extractedTexts
      ? extractedTexts.join("\n")
      : "";

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
        Figma 페이지 URL을 입력하면 디자인에서 UI 요소를 추출하여 TC를
        생성합니다. 페이지별로 하나씩 진행하세요.
      </div>

      {/* Figma Token */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Figma Access Token
        </label>
        <div className="relative">
          <input
            type={showToken ? "text" : "password"}
            value={figmaToken}
            onChange={(e) => handleTokenChange(e.target.value)}
            placeholder="figd_xxxx... (figma.com/developers/api#access-tokens)"
            className="w-full px-3 py-2 pr-16 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
          />
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
          >
            {showToken ? "숨기기" : "보기"}
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-400">
          Figma &gt; Settings &gt; Personal Access Tokens에서 발급
        </p>
      </div>

      {/* URL Input + Extract */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Figma 페이지 URL
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={figmaUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://www.figma.com/design/xxxxx/Name?node-id=0-1"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
          />
          <button
            onClick={handleExtract}
            disabled={isExtracting || !figmaUrl.trim()}
            className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition whitespace-nowrap flex items-center gap-2"
          >
            {isExtracting ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                추출 중...
              </>
            ) : (
              "추출"
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {extractError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 whitespace-pre-line">
          {extractError}
        </div>
      )}

      {/* Extracted preview */}
      {extractedTexts && (
        <>
          <div className="bg-gray-50 border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">
                {pageName}
                {extractedFrames
                  ? ` (${extractedFrames.length}개 프레임)`
                  : ` (${extractedTexts.length}개 요소)`}
              </span>
              <button
                onClick={() => {
                  setExtractedTexts(null);
                  setExtractedFrames(null);
                  setPageName("");
                }}
                className="text-xs text-red-500 hover:text-red-700"
              >
                삭제
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto text-sm text-gray-600 whitespace-pre-wrap bg-white border rounded p-3">
              {formattedText.slice(0, 3000)}
              {formattedText.length > 3000 && (
                <span className="text-gray-400">
                  ... ({extractedTexts.length}개 항목 중 일부 표시)
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => onGenerate({ figmaText: formattedText })}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                TC 생성 중...
              </>
            ) : (
              "이 페이지로 TC 생성하기"
            )}
          </button>
        </>
      )}
    </div>
  );
}
