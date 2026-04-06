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

interface SavedLearnData {
  name: string;
  frameName: string;
  text: string;
  savedAt: number;
}

interface Props {
  onGenerate: (data: { figmaText: string }) => void;
  isLoading: boolean;
}

const CACHE_KEY_PREFIX = "figma_cache_";
const LEARN_KEY = "figma_learn_list";
const CACHE_TTL = 1000 * 60 * 60;

function getCachedData(fileKey: string, nodeId: string): CachedPageData | null {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}${fileKey}_${nodeId}`);
    if (!raw) return null;
    const data = JSON.parse(raw) as CachedPageData;
    if (Date.now() - data.fetchedAt > CACHE_TTL) return null;
    return data;
  } catch { return null; }
}

function setCachedData(fileKey: string, nodeId: string, data: CachedPageData) {
  try {
    localStorage.setItem(`${CACHE_KEY_PREFIX}${fileKey}_${nodeId}`, JSON.stringify(data));
  } catch { /* */ }
}

function getSavedLearnList(): SavedLearnData[] {
  try {
    return JSON.parse(localStorage.getItem(LEARN_KEY) || "[]");
  } catch { return []; }
}

function saveLearnData(item: SavedLearnData) {
  const list = getSavedLearnList();
  const existing = list.findIndex((l) => l.name === item.name);
  if (existing >= 0) list[existing] = item;
  else list.unshift(item);
  localStorage.setItem(LEARN_KEY, JSON.stringify(list.slice(0, 20)));
}

function deleteLearnData(name: string) {
  const list = getSavedLearnList().filter((l) => l.name !== name);
  localStorage.setItem(LEARN_KEY, JSON.stringify(list));
}

type Step = "select" | "extract" | "review" | "ready";

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
  const [step, setStep] = useState<Step>("select");
  const [editableText, setEditableText] = useState("");
  const [savedList, setSavedList] = useState<SavedLearnData[]>([]);
  const [learnName, setLearnName] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("figma_access_token");
    if (saved) setFigmaToken(saved);
    const savedUrl = localStorage.getItem("figma_last_url");
    if (savedUrl) setFigmaUrl(savedUrl);
    const savedFrame = localStorage.getItem("figma_last_frame");
    if (savedFrame) setFrameName(savedFrame);
    setSavedList(getSavedLearnList());
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

  // Figma API에서 추출
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
      setExtractError("올바른 Figma 페이지 URL을 입력해주세요.");
      return;
    }

    setIsExtracting(true);

    try {
      const { fileKey, nodeId } = parsed;
      let pageData = getCachedData(fileKey, nodeId);

      if (pageData) {
        setUsedCache(true);
      } else {
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
          res = await fetch(apiUrl, { headers: { "X-Figma-Token": figmaToken.trim() } });
          if (res.status !== 429) break;
        }

        if (!res || !res.ok) {
          const errBody = await res?.text().catch(() => "") || "";
          let errData: Record<string, string> = {};
          try { errData = JSON.parse(errBody); } catch { /* */ }
          const errMsg = errData?.message || errData?.err || "";
          if (res?.status === 429 || errMsg.toLowerCase().includes("rate limit"))
            throw new Error("Figma API 요청 제한 초과. 잠시 후 다시 시도해주세요.");
          if (res?.status === 403)
            throw new Error(`Figma 접근 거부: ${errMsg || "토큰 확인 필요"}`);
          throw new Error(`Figma API 오류 (${res?.status})`);
        }

        const data = await res.json();
        const nodeData = data.nodes?.[nodeId];
        if (!nodeData?.document) throw new Error("노드를 찾을 수 없습니다.");

        const document = nodeData.document as FigmaNode;
        pageData = { pageName: document.name, frames: extractFrameGroups(document), fetchedAt: Date.now() };
        setCachedData(fileKey, nodeId, pageData);
      }

      setPageName(pageData.pageName);
      setAllFrames(pageData.frames);

      if (frameName.trim()) {
        const target = frameName.trim().toLowerCase();
        const matched = pageData.frames.find((f) => f.frameName.toLowerCase() === target)
          || (pageData.frames.filter((f) => f.frameName.toLowerCase().includes(target)).length === 1
            ? pageData.frames.find((f) => f.frameName.toLowerCase().includes(target))
            : null);

        if (matched) {
          setSelectedFrame(matched);
          setEditableText(`[프레임: ${matched.frameName}]\n${matched.texts.join("\n")}`);
          setLearnName(matched.frameName);
          setStep("review");
        } else {
          const partial = pageData.frames.filter((f) => f.frameName.toLowerCase().includes(target));
          setExtractError(
            partial.length > 1
              ? `일치하는 프레임 ${partial.length}개:\n${partial.map((f) => `• ${f.frameName}`).join("\n")}`
              : `'${frameName}' 프레임 없음.\n\n사용 가능:\n${pageData.frames.map((f) => `• ${f.frameName}`).join("\n")}`
          );
          setStep("extract");
        }
      } else {
        if (pageData.frames.length === 0) throw new Error("텍스트가 포함된 프레임이 없습니다.");
        setStep("extract");
      }
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "추출 오류");
      setStep("extract");
    } finally {
      setIsExtracting(false);
    }
  }, [figmaUrl, figmaToken, frameName]);

  // 프레임 목록에서 선택
  const handleSelectFrame = (frame: FigmaFrame) => {
    setSelectedFrame(frame);
    setFrameName(frame.frameName);
    localStorage.setItem("figma_last_frame", frame.frameName);
    setExtractError("");
    setEditableText(`[프레임: ${frame.frameName}]\n${frame.texts.join("\n")}`);
    setLearnName(frame.frameName);
    setStep("review");
  };

  // 학습 데이터 저장
  const handleSaveLearn = () => {
    if (!learnName.trim() || !editableText.trim()) return;
    saveLearnData({
      name: learnName.trim(),
      frameName: selectedFrame?.frameName || learnName.trim(),
      text: editableText,
      savedAt: Date.now(),
    });
    setSavedList(getSavedLearnList());
  };

  // 저장된 학습 데이터 불러오기
  const handleLoadLearn = (item: SavedLearnData) => {
    setEditableText(item.text);
    setLearnName(item.name);
    setSelectedFrame({ frameName: item.frameName, texts: [] });
    setStep("ready");
  };

  // 저장된 데이터 삭제
  const handleDeleteLearn = (name: string) => {
    deleteLearnData(name);
    setSavedList(getSavedLearnList());
  };

  const estimatedTokens = Math.ceil(editableText.length / 2);

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-1.5 text-xs">
        {[
          { key: "select", label: "소스 선택" },
          { key: "extract", label: "데이터 추출" },
          { key: "review", label: "학습/편집" },
          { key: "ready", label: "TC 생성" },
        ].map((s, i) => (
          <span key={s.key} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-gray-300">→</span>}
            <span className={`px-2 py-0.5 rounded-full font-medium ${step === s.key ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-400"}`}>
              {s.label}
            </span>
          </span>
        ))}
      </div>

      {/* ===== 소스 선택 ===== */}
      {step === "select" && (
        <>
          {/* 저장된 학습 데이터 */}
          {savedList.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-sm font-semibold text-green-800 mb-2">
                저장된 학습 데이터 ({savedList.length}개)
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {savedList.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <button
                      onClick={() => handleLoadLearn(item)}
                      className="flex-1 text-left px-3 py-2 text-sm bg-white rounded-lg border hover:border-green-400 hover:bg-green-50 transition"
                    >
                      <span className="font-mono text-green-700 font-medium">{item.name}</span>
                      <span className="text-gray-400 ml-2">({item.text.length}자)</span>
                      <span className="text-gray-300 ml-1 text-xs">
                        {new Date(item.savedAt).toLocaleDateString("ko-KR")}
                      </span>
                    </button>
                    <button
                      onClick={() => handleDeleteLearn(item.name)}
                      className="text-xs text-red-400 hover:text-red-600 px-1"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 새로 추출 */}
          <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
            <div className="text-sm font-semibold text-gray-700">Figma에서 새로 추출</div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Access Token</label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={figmaToken}
                  onChange={(e) => handleTokenChange(e.target.value)}
                  placeholder="figd_xxxx..."
                  className="w-full px-3 py-1.5 pr-14 border border-gray-300 rounded-lg text-sm outline-none text-gray-900"
                />
                <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 px-1">
                  {showToken ? "숨기기" : "보기"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">페이지 URL</label>
              <input
                type="text"
                value={figmaUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://www.figma.com/design/xxxxx/Name?node-id=0-1"
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none text-gray-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                프레임 Name <span className="text-gray-400">(비워두면 목록 표시)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={frameName}
                  onChange={(e) => handleFrameNameChange(e.target.value)}
                  placeholder="예: CNT_DRG_02"
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none text-gray-900"
                />
                <button
                  onClick={handleExtract}
                  disabled={isExtracting || !figmaUrl.trim()}
                  className="px-4 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition flex items-center gap-1.5"
                >
                  {isExtracting ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      추출 중...
                    </>
                  ) : "추출"}
                </button>
              </div>
            </div>

            {usedCache && (
              <div className="text-xs text-green-600">캐시 사용 중 (API 호출 없음)</div>
            )}
          </div>

          {extractError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 whitespace-pre-line">
              {extractError}
            </div>
          )}
        </>
      )}

      {/* ===== 프레임 목록 (추출 결과) ===== */}
      {step === "extract" && (
        <>
          {allFrames.length > 0 && (
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

          {extractError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 whitespace-pre-line">
              {extractError}
            </div>
          )}

          <button onClick={() => setStep("select")} className="text-sm text-gray-500 hover:text-gray-700">
            ← 돌아가기
          </button>
        </>
      )}

      {/* ===== 학습/편집 ===== */}
      {step === "review" && (
        <>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-700">
            추출된 내용을 확인하고 편집하세요. <strong>저장</strong>하면 다음번에 바로 불러올 수 있습니다.
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-semibold text-gray-700">추출 내용 (편집 가능)</label>
              <span className="text-xs text-gray-400">{editableText.length}자 · ~{estimatedTokens} 토큰</span>
            </div>
            <textarea
              value={editableText}
              onChange={(e) => setEditableText(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-y text-gray-900 font-mono leading-relaxed"
            />
            <p className="mt-1 text-xs text-gray-400">
              불필요한 내용을 삭제하면 토큰 사용량이 줄어듭니다.
            </p>
          </div>

          {/* 학습 데이터 저장 */}
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={learnName}
              onChange={(e) => setLearnName(e.target.value)}
              placeholder="저장 이름 (예: CNT_DRG_02)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none text-gray-900"
            />
            <button
              onClick={handleSaveLearn}
              disabled={!learnName.trim() || !editableText.trim()}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition whitespace-nowrap"
            >
              학습 데이터 저장
            </button>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep("select")} className="px-4 py-2.5 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition">
              ← 돌아가기
            </button>
            <button
              onClick={() => setStep("ready")}
              disabled={!editableText.trim()}
              className="flex-1 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition"
            >
              확인 완료 → TC 생성
            </button>
          </div>
        </>
      )}

      {/* ===== TC 생성 ===== */}
      {step === "ready" && (
        <>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
            <strong>✓ 준비 완료</strong> — {learnName} ({editableText.length}자 · ~{estimatedTokens} 토큰)
          </div>

          <div className="bg-gray-50 border rounded-lg p-3 max-h-32 overflow-y-auto text-xs text-gray-600 whitespace-pre-wrap font-mono">
            {editableText.slice(0, 1500)}
            {editableText.length > 1500 && <span className="text-gray-400">...</span>}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep("review")} className="px-4 py-2.5 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition">
              ← 수정
            </button>
            <button
              onClick={() => onGenerate({ figmaText: editableText })}
              disabled={isLoading}
              className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  TC 생성 중...
                </>
              ) : `TC 생성하기`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
