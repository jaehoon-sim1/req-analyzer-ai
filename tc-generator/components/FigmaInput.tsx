"use client";

import { useState, useEffect, useCallback } from "react";
import {
  parseFigmaUrl,
  extractFrameGroups,
  FigmaNode,
} from "@/lib/figma";

interface FigmaFrame {
  frameName: string;
  texts: string[];
}

interface CachedPageData {
  pageName: string;
  frames: FigmaFrame[];
  fetchedAt: number;
}

interface Props {
  onGenerate: (data: { figmaText: string }) => void;
  isLoading: boolean;
}

const CACHE_KEY_PREFIX = "figma_cache_";
const CACHE_TTL = 1000 * 60 * 60; // 1시간

function getCacheKey(fileKey: string, nodeId: string): string {
  return `${CACHE_KEY_PREFIX}${fileKey}_${nodeId}`;
}

function getCachedData(fileKey: string, nodeId: string): CachedPageData | null {
  try {
    const key = getCacheKey(fileKey, nodeId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw) as CachedPageData;
    if (Date.now() - data.fetchedAt > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCachedData(fileKey: string, nodeId: string, data: CachedPageData) {
  try {
    localStorage.setItem(getCacheKey(fileKey, nodeId), JSON.stringify(data));
  } catch {
    // localStorage full 등 무시
  }
}

function clearCachedData(fileKey: string, nodeId: string) {
  localStorage.removeItem(getCacheKey(fileKey, nodeId));
}

export default function FigmaInput({ onGenerate, isLoading }: Props) {
  const [figmaToken, setFigmaToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [figmaUrl, setFigmaUrl] = useState("");
  const [frameName, setFrameName] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState<FigmaFrame | null>(null);
  const [allFrames, setAllFrames] = useState<FigmaFrame[]>([]);
  const [pageName, setPageName] = useState("");
  const [extractError, setExtractError] = useState("");
  const [usedCache, setUsedCache] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("figma_access_token");
    if (saved) setFigmaToken(saved);
    const savedUrl = localStorage.getItem("figma_last_url");
    if (savedUrl) setFigmaUrl(savedUrl);
    const savedFrame = localStorage.getItem("figma_last_frame");
    if (savedFrame) setFrameName(savedFrame);
  }, []);

  const handleTokenChange = (token: string) => {
    const trimmed = token.trim();
    setFigmaToken(trimmed);
    localStorage.setItem("figma_access_token", trimmed);
  };

  const handleUrlChange = (url: string) => {
    setFigmaUrl(url);
    localStorage.setItem("figma_last_url", url);
  };

  const handleFrameNameChange = (name: string) => {
    setFrameName(name);
    localStorage.setItem("figma_last_frame", name);
  };

  const handleExtract = useCallback(async () => {
    setExtractError("");
    setSelectedFrame(null);
    setAllFrames([]);
    setUsedCache(false);

    if (!figmaToken.trim()) {
      setExtractError("Figma 액세스 토큰을 먼저 입력해주세요.");
      return;
    }

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

      // 1. 캐시 확인
      let pageData = getCachedData(fileKey, nodeId);

      if (pageData) {
        setUsedCache(true);
      } else {
        // 2. Figma API 호출
        const apiUrl = `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`;

        const maxRetries = 3;
        let res: Response | null = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          if (attempt > 0) {
            const delay = attempt * 30000;
            setExtractError(`Rate limit — ${delay / 1000}초 대기 후 재시도 (${attempt}/${maxRetries})...`);
            await new Promise((r) => setTimeout(r, delay));
            setExtractError("");
          }

          res = await fetch(apiUrl, {
            headers: { "X-Figma-Token": figmaToken.trim() },
          });

          if (res.status !== 429) break;
        }

        if (!res || !res.ok) {
          const errBody = await res?.text().catch(() => "") || "";
          let errData: Record<string, string> = {};
          try { errData = JSON.parse(errBody); } catch { /* */ }
          const errMsg = errData?.message || errData?.err || "";

          if (res?.status === 429 || errMsg.toLowerCase().includes("rate limit")) {
            throw new Error("Figma API 요청 제한 초과. 잠시 후 다시 시도해주세요.");
          }
          if (res?.status === 403) {
            throw new Error(`Figma 접근 거부: ${errMsg || "토큰 확인 필요"}`);
          }
          throw new Error(`Figma API 오류 (${res?.status}): ${errMsg || errBody.slice(0, 100)}`);
        }

        const data = await res.json();
        const nodeData = data.nodes?.[nodeId];

        if (!nodeData?.document) {
          throw new Error("해당 노드를 찾을 수 없습니다. URL의 node-id를 확인해주세요.");
        }

        const document = nodeData.document as FigmaNode;
        const frames = extractFrameGroups(document);

        pageData = {
          pageName: document.name,
          frames,
          fetchedAt: Date.now(),
        };

        // 3. 캐시 저장
        setCachedData(fileKey, nodeId, pageData);
      }

      setPageName(pageData.pageName);
      setAllFrames(pageData.frames);

      // 4. 프레임 이름으로 필터링
      if (frameName.trim()) {
        const target = frameName.trim().toLowerCase();
        const matched = pageData.frames.find(
          (f) => f.frameName.toLowerCase() === target
        );
        if (matched) {
          setSelectedFrame(matched);
        } else {
          // 부분 일치 시도
          const partial = pageData.frames.filter(
            (f) => f.frameName.toLowerCase().includes(target)
          );
          if (partial.length === 1) {
            setSelectedFrame(partial[0]);
          } else if (partial.length > 1) {
            setExtractError(
              `'${frameName}' 와 일치하는 프레임이 ${partial.length}개입니다:\n` +
              partial.map((f) => `• ${f.frameName}`).join("\n") +
              "\n\n정확한 프레임 이름을 입력해주세요."
            );
          } else {
            setExtractError(
              `'${frameName}' 프레임을 찾을 수 없습니다.\n\n` +
              `사용 가능한 프레임 (${pageData.frames.length}개):\n` +
              pageData.frames.map((f) => `• ${f.frameName}`).join("\n")
            );
          }
        }
      } else {
        // 프레임 이름 미입력 시 전체 프레임 목록 표시
        if (pageData.frames.length === 0) {
          throw new Error("텍스트가 포함된 프레임이 없습니다.");
        }
      }
    } catch (err) {
      setExtractError(
        err instanceof Error ? err.message : "Figma 추출 중 오류 발생"
      );
    } finally {
      setIsExtracting(false);
    }
  }, [figmaUrl, figmaToken, frameName]);

  // 프레임 선택 시 바로 설정
  const handleSelectFrame = (frame: FigmaFrame) => {
    setSelectedFrame(frame);
    setFrameName(frame.frameName);
    localStorage.setItem("figma_last_frame", frame.frameName);
    setExtractError("");
  };

  // 캐시 삭제
  const handleClearCache = () => {
    const parsed = parseFigmaUrl(figmaUrl);
    if (parsed) {
      clearCachedData(parsed.fileKey, parsed.nodeId);
      setAllFrames([]);
      setSelectedFrame(null);
      setPageName("");
      setUsedCache(false);
    }
  };

  const formattedText = selectedFrame
    ? `[프레임: ${selectedFrame.frameName}]\n${selectedFrame.texts.join("\n")}`
    : "";

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
        페이지 URL과 프레임 이름을 입력하면 해당 프레임의 UI 요소만 추출하여 TC를 생성합니다.
        <br />한 번 추출한 페이지 데이터는 캐시되어 반복 요청을 방지합니다.
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
            placeholder="figd_xxxx..."
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
      </div>

      {/* Page URL */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          페이지 URL
        </label>
        <input
          type="text"
          value={figmaUrl}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="https://www.figma.com/design/xxxxx/Name?node-id=0-1"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
        />
      </div>

      {/* Frame Name */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          프레임 Name <span className="text-gray-400 font-normal">(선택 — 비워두면 프레임 목록 표시)</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={frameName}
            onChange={(e) => handleFrameNameChange(e.target.value)}
            placeholder="예: CNT_DRG_02"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-gray-900"
          />
          <button
            onClick={handleExtract}
            disabled={isExtracting || !figmaUrl.trim()}
            className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition whitespace-nowrap flex items-center gap-2"
          >
            {isExtracting ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                추출 중...
              </>
            ) : (
              "추출"
            )}
          </button>
        </div>
      </div>

      {/* Cache indicator */}
      {usedCache && (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <span className="text-xs text-green-700">
            캐시된 데이터 사용 중 (API 호출 없음)
          </span>
          <button
            onClick={handleClearCache}
            className="text-xs text-green-600 hover:text-green-800 underline"
          >
            캐시 삭제
          </button>
        </div>
      )}

      {/* Error */}
      {extractError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 whitespace-pre-line">
          {extractError}
        </div>
      )}

      {/* Frame list (프레임 이름 미입력 시) */}
      {allFrames.length > 0 && !selectedFrame && !extractError && (
        <div className="bg-gray-50 border rounded-lg p-4">
          <div className="text-sm font-semibold text-gray-700 mb-2">
            {pageName} — {allFrames.length}개 프레임
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {allFrames.map((frame, i) => (
              <button
                key={i}
                onClick={() => handleSelectFrame(frame)}
                className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-purple-50 hover:text-purple-700 transition border border-transparent hover:border-purple-200"
              >
                <span className="font-mono text-purple-600">{frame.frameName}</span>
                <span className="text-gray-400 ml-2">({frame.texts.length}개 텍스트)</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected frame preview */}
      {selectedFrame && (
        <>
          <div className="bg-gray-50 border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">
                <span className="font-mono text-purple-600">{selectedFrame.frameName}</span>
                <span className="text-gray-400 ml-2">({selectedFrame.texts.length}개 텍스트)</span>
              </span>
              <button
                onClick={() => {
                  setSelectedFrame(null);
                  setFrameName("");
                  localStorage.removeItem("figma_last_frame");
                }}
                className="text-xs text-red-500 hover:text-red-700"
              >
                선택 해제
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto text-sm text-gray-600 whitespace-pre-wrap bg-white border rounded p-3">
              {formattedText.slice(0, 3000)}
              {formattedText.length > 3000 && (
                <span className="text-gray-400">... (일부 표시)</span>
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
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                TC 생성 중...
              </>
            ) : (
              `이 프레임으로 TC 생성하기 (${selectedFrame.frameName})`
            )}
          </button>
        </>
      )}
    </div>
  );
}
