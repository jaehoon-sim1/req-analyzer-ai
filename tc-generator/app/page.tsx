"use client";

import { useState, useEffect, useCallback } from "react";
import TemplateForm from "@/components/TemplateForm";
import PdfUploader from "@/components/PdfUploader";
import FigmaInput from "@/components/FigmaInput";
import ResultPreview from "@/components/ResultPreview";
import ProgressDisplay from "@/components/ProgressDisplay";
import { TestSection } from "@/lib/types";

type Tab = "text" | "pdf" | "figma";
type AIProvider = "gemini" | "openrouter" | "claude";

interface ProgressState {
  percent: number;
  message: string;
  stage: "analyzing" | "generating" | "finalizing";
}

const PROVIDER_INFO: Record<
  AIProvider,
  { label: string; placeholder: string; guide: string; storageKey: string }
> = {
  openrouter: {
    label: "OpenRouter API Key",
    placeholder: "API 키를 입력하세요 (openrouter.ai/keys 에서 발급)",
    guide: "openrouter.ai/keys 에서 무료 회원가입 후 발급 (무료 모델 사용)",
    storageKey: "openrouter_api_key",
  },
  claude: {
    label: "Claude API Key",
    placeholder: "sk-ant-... (console.anthropic.com 에서 발급)",
    guide: "console.anthropic.com/settings/keys 에서 발급 (Haiku 4.5 사용)",
    storageKey: "claude_api_key",
  },
  gemini: {
    label: "Gemini API Key",
    placeholder: "API 키를 입력하세요 (aistudio.google.com/apikey 에서 발급)",
    guide: "aistudio.google.com/apikey 에서 무료 발급",
    storageKey: "gemini_api_key",
  },
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("text");
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");
  const [sections, setSections] = useState<TestSection[] | null>(null);
  const [functionName, setFunctionName] = useState("");
  const [provider, setProvider] = useState<AIProvider>("openrouter");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [lastRequestBody, setLastRequestBody] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [prevSections, setPrevSections] = useState<TestSection[] | null>(null);
  const [prevFunctionName, setPrevFunctionName] = useState("");
  const [errorFeedback, setErrorFeedback] = useState("");

  // Load saved provider and API key from localStorage
  useEffect(() => {
    const savedProvider = localStorage.getItem("ai_provider") as AIProvider;
    if (savedProvider && PROVIDER_INFO[savedProvider]) {
      setProvider(savedProvider);
      const savedKey = localStorage.getItem(
        PROVIDER_INFO[savedProvider].storageKey
      );
      if (savedKey) setApiKey(savedKey);
    } else {
      const savedKey = localStorage.getItem(
        PROVIDER_INFO["openrouter"].storageKey
      );
      if (savedKey) setApiKey(savedKey);
    }
  }, []);

  const handleProviderChange = (newProvider: AIProvider) => {
    localStorage.setItem(PROVIDER_INFO[provider].storageKey, apiKey);
    localStorage.setItem("ai_provider", newProvider);
    setProvider(newProvider);
    const savedKey = localStorage.getItem(
      PROVIDER_INFO[newProvider].storageKey
    );
    setApiKey(savedKey || "");
  };

  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    localStorage.setItem(PROVIDER_INFO[provider].storageKey, key);
  };

  // Shared SSE streaming generate function
  const streamGenerate = useCallback(
    async (body: Record<string, unknown>) => {
      if (!apiKey.trim()) {
        setError("API 키를 먼저 입력해주세요.");
        return;
      }

      setIsLoading(true);
      setError("");
      setErrorFeedback("");

      // 현재 결과가 있으면 이전 결과로 보존
      if (sections) {
        setPrevSections(sections);
        setPrevFunctionName(functionName);
      }

      setSections(null);
      setProgress({ percent: 0, message: "준비 중...", stage: "analyzing" });

      // 재생성이 아닌 경우에만 lastRequestBody 저장
      if (!body.feedback) {
        setLastRequestBody(body);
      }

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, stream: true, apiKey, provider }),
        });

        if (!res.body) {
          throw new Error("스트리밍을 지원하지 않는 응답입니다.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // SSE 메시지는 빈 줄(\n\n)로 구분됨
          let boundary = buffer.indexOf("\n\n");
          while (boundary !== -1) {
            const message = buffer.slice(0, boundary).trim();
            buffer = buffer.slice(boundary + 2);

            if (message.startsWith("data: ")) {
              const jsonStr = message.slice(6);
              try {
                const data = JSON.parse(jsonStr);

                if (data.type === "progress") {
                  setProgress({
                    percent: data.percent,
                    message: data.message,
                    stage: data.stage,
                  });
                } else if (data.type === "result") {
                  setProgress({
                    percent: 100,
                    message: "완료!",
                    stage: "finalizing",
                  });
                  setSections(data.sections);
                  setFunctionName(data.functionName);
                  // 성공 시 이전 결과 클리어
                  setPrevSections(null);
                  setPrevFunctionName("");
                } else if (data.type === "error") {
                  throw new Error(data.error);
                }
              } catch (parseErr) {
                // JSON이 아직 불완전한 경우 → 다음 청크와 합쳐서 재시도
                if (
                  parseErr instanceof SyntaxError &&
                  parseErr.message.includes("Unterminated")
                ) {
                  // 버퍼에 다시 넣어서 다음 청크와 합침
                  buffer = message + "\n\n" + buffer;
                  break;
                }
                if (
                  parseErr instanceof Error &&
                  !parseErr.message.includes("Unexpected end")
                ) {
                  throw parseErr;
                }
              }
            }

            boundary = buffer.indexOf("\n\n");
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
        setProgress(null);
      }
    },
    [apiKey, provider]
  );

  const handleTextGenerate = async (data: {
    functionName: string;
    description: string;
    policies: string;
  }) => {
    await streamGenerate({ ...data, mode: "text", preview: true });
  };

  const handleFileGenerate = async (data: {
    pdfText?: string;
    imageBase64?: string;
  }) => {
    const isImage = !!data.imageBase64;
    await streamGenerate({
      ...(isImage
        ? { imageBase64: data.imageBase64, mode: "image" }
        : { pdfText: data.pdfText, mode: "pdf" }),
      preview: true,
    });
  };

  const handleFigmaGenerate = async (data: { figmaText: string }) => {
    await streamGenerate({
      figmaText: data.figmaText,
      mode: "figma",
      preview: true,
    });
  };

  // 이전 결과를 요약 텍스트로 변환
  const summarizeSections = (secs: TestSection[]): string => {
    return secs
      .map((s) => {
        const tcList = s.testCases
          .map(
            (tc, i) =>
              `  ${i + 1}. [${[tc.depth1, tc.depth2, tc.depth3].filter(Boolean).join(" > ")}] ${tc.procedure.split("\n")[0]}`
          )
          .join("\n");
        return `${s.storyId} - ${s.sectionTitle} (${s.testCases.length}건)\n${tcList}`;
      })
      .join("\n\n");
  };

  const handleRegenerate = async (feedback: string) => {
    if (!lastRequestBody) return;

    // 현재 결과 또는 이전 결과에서 요약 생성
    const activeSections = sections || prevSections;
    const previousResult = activeSections
      ? summarizeSections(activeSections)
      : "";

    await streamGenerate({
      ...lastRequestBody,
      feedback,
      previousResult: previousResult || undefined,
    });
  };

  // 에러 상태에서 피드백으로 재생성
  const handleErrorRegenerate = async () => {
    if (!errorFeedback.trim() || !lastRequestBody) return;
    await handleRegenerate(errorFeedback.trim());
  };

  // 이전 결과 복원
  const handleRestorePrevious = () => {
    if (!prevSections) return;
    setSections(prevSections);
    setFunctionName(prevFunctionName);
    setPrevSections(null);
    setPrevFunctionName("");
    setError("");
    setErrorFeedback("");
  };

  const handleDownload = async () => {
    if (!sections) return;

    setIsDownloading(true);

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections, functionName }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "다운로드 실패");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `TestCase_${functionName}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "다운로드 오류");
    } finally {
      setIsDownloading(false);
    }
  };

  const info = PROVIDER_INFO[provider];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">TC Generator</h1>
        <p className="mt-2 text-gray-500">
          요구사항을 입력하면 TestCase를 자동으로 생성합니다
        </p>
      </div>

      {/* AI Provider & API Key Section */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        {/* Provider Selector */}
        <div className="flex items-center gap-3 mb-3">
          <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
            AI 제공자
          </label>
          <div className="flex gap-2 flex-wrap">
            {(
              Object.keys(PROVIDER_INFO) as AIProvider[]
            ).map((key) => (
              <button
                key={key}
                onClick={() => handleProviderChange(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                  provider === key
                    ? "bg-blue-50 border-blue-300 text-blue-700"
                    : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                }`}
              >
                {key === "openrouter"
                  ? "OpenRouter (추천)"
                  : key === "claude"
                    ? "Claude"
                    : "Gemini"}
              </button>
            ))}
          </div>
        </div>

        {/* API Key Input */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
            {info.label}
          </label>
          <div className="flex-1 relative">
            <input
              type={showApiKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder={info.placeholder}
              className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
            >
              {showApiKey ? "숨기기" : "보기"}
            </button>
          </div>
          {apiKey && (
            <span className="text-xs text-green-600 whitespace-nowrap">
              저장됨
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-gray-400">
          {info.guide} | 키는 브라우저에만 저장되며 서버에 보관되지 않습니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Input */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          {/* Tabs */}
          <div className="flex border-b mb-6">
            <button
              onClick={() => setActiveTab("text")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                activeTab === "text"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              텍스트 입력
            </button>
            <button
              onClick={() => setActiveTab("pdf")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                activeTab === "pdf"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              파일 업로드
            </button>
            <button
              onClick={() => setActiveTab("figma")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                activeTab === "figma"
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Figma
            </button>
          </div>

          {activeTab === "text" && (
            <TemplateForm
              onGenerate={handleTextGenerate}
              isLoading={isLoading}
            />
          )}
          {activeTab === "pdf" && (
            <PdfUploader
              onGenerate={handleFileGenerate}
              isLoading={isLoading}
            />
          )}
          {activeTab === "figma" && (
            <FigmaInput
              onGenerate={handleFigmaGenerate}
              isLoading={isLoading}
            />
          )}
        </div>

        {/* Right: Result */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">생성 결과</h2>

          {error && (
            <div className="space-y-3">
              {/* 에러 메시지 */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                {error}
              </div>

              {/* 이전 결과 복원 버튼 */}
              {prevSections && (
                <button
                  onClick={handleRestorePrevious}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-100 transition"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z"
                    />
                  </svg>
                  이전 결과 보기 ({prevFunctionName} — {prevSections.length}개
                  섹션,{" "}
                  {prevSections.reduce(
                    (sum, s) => sum + s.testCases.length,
                    0
                  )}
                  개 TC)
                </button>
              )}

              {/* 피드백 입력 후 재생성 */}
              {lastRequestBody && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-amber-800 mb-2">
                    어떻게 수정할까요?
                  </h4>
                  <textarea
                    value={errorFeedback}
                    onChange={(e) => setErrorFeedback(e.target.value)}
                    placeholder="예: 경계값 테스트를 더 추가해주세요, 섹션을 3개로 나눠주세요..."
                    rows={2}
                    className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none resize-none bg-white text-gray-900 placeholder-gray-400"
                    disabled={isLoading}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-amber-600">
                      요청사항을 입력하면 반영하여 다시 생성합니다
                    </p>
                    <button
                      onClick={handleErrorRegenerate}
                      disabled={isLoading || !errorFeedback.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                    >
                      {isLoading ? (
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
                          재생성 중...
                        </>
                      ) : (
                        <>
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                          재생성
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {isLoading && progress && (
            <ProgressDisplay
              percent={progress.percent}
              message={progress.message}
              stage={progress.stage}
            />
          )}

          {!isLoading && !sections && !error && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <svg
                className="h-16 w-16 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-sm">
                왼쪽에서 요구사항을 입력하면
                <br />
                여기에 결과가 표시됩니다
              </p>
            </div>
          )}

          {sections && (
            <ResultPreview
              sections={sections}
              functionName={functionName}
              onDownload={handleDownload}
              isDownloading={isDownloading}
              onRegenerate={handleRegenerate}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
