"use client";

import { useState, useCallback, useEffect } from "react";
import { ComparisonResult, ParsedTCSection } from "@/lib/types";
import { parseExcelTC, formatTCsForComparison } from "@/lib/excel-parser";
import {
  parseFigmaUrl,
  extractTextFromNodes,
  extractFrameGroups,
  FigmaNode,
} from "@/lib/figma";
import ProgressDisplay from "./ProgressDisplay";

interface Props {
  apiKey: string;
  provider: string;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
}

export default function CompareView({ apiKey, provider, isLoading, setIsLoading }: Props) {
  // TC 입력
  const [tcInputMode, setTcInputMode] = useState<"excel" | "url">("excel");
  const [tcText, setTcText] = useState("");
  const [tcFileName, setTcFileName] = useState("");
  const [parsedSections, setParsedSections] = useState<ParsedTCSection[] | null>(null);
  const [excelUrl, setExcelUrl] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState("");

  // 기획서 입력
  const [reqInputMode, setReqInputMode] = useState<"figma" | "text">("figma");
  const [reqText, setReqText] = useState("");
  const [figmaToken, setFigmaToken] = useState("");
  const [figmaUrl, setFigmaUrl] = useState("");
  const [figmaLoading, setFigmaLoading] = useState(false);
  const [figmaError, setFigmaError] = useState("");
  const [figmaPageName, setFigmaPageName] = useState("");

  // 결과
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<{ percent: number; message: string } | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("figma_access_token");
    if (savedToken) setFigmaToken(savedToken);
    const savedUrl = localStorage.getItem("figma_compare_url");
    if (savedUrl) setFigmaUrl(savedUrl);
    const savedExcelUrl = localStorage.getItem("compare_excel_url");
    if (savedExcelUrl) setExcelUrl(savedExcelUrl);
  }, []);

  // ===== TC: Excel 업로드 =====
  const handleExcelUpload = useCallback(async (file: File) => {
    try {
      const sections = await parseExcelTC(file);
      setParsedSections(sections);
      setTcFileName(file.name);
      setTcText(formatTCsForComparison(sections));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Excel 파싱 실패");
    }
  }, []);

  // ===== TC: Microsoft 365 Excel URL =====
  const handleExcelUrl = useCallback(async () => {
    if (!excelUrl.trim()) return;
    setUrlLoading(true);
    setUrlError("");
    localStorage.setItem("compare_excel_url", excelUrl);

    try {
      // Microsoft 365 공유 URL에서 다운로드 URL 생성
      let downloadUrl = excelUrl;

      if (excelUrl.includes("sharepoint.com") || excelUrl.includes("onedrive.live.com") || excelUrl.includes("1drv.ms")) {
        // SharePoint/OneDrive URL → download=1 파라미터 추가
        if (excelUrl.includes("?")) {
          downloadUrl = excelUrl + "&download=1";
        } else {
          downloadUrl = excelUrl + "?download=1";
        }
      }

      const res = await fetch("/api/fetch-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: downloadUrl }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Excel 가져오기 실패 (${res.status})`);
      }

      const blob = await res.blob();
      const file = new File([blob], "online.xlsx", { type: blob.type });
      await handleExcelUpload(file);
    } catch (err) {
      setUrlError(
        err instanceof Error ? err.message :
        "Excel URL에서 파일을 가져올 수 없습니다.\nURL이 공유 링크인지 확인하거나, 직접 다운로드 후 업로드해주세요."
      );
    } finally {
      setUrlLoading(false);
    }
  }, [excelUrl, handleExcelUpload]);

  // ===== 기획서: Figma 전체 페이지 추출 =====
  const handleFigmaExtract = useCallback(async () => {
    if (!figmaToken.trim()) { setFigmaError("Figma 토큰을 입력해주세요."); return; }

    const parsed = parseFigmaUrl(figmaUrl);
    if (!parsed) { setFigmaError("올바른 Figma URL을 입력해주세요."); return; }

    setFigmaLoading(true);
    setFigmaError("");
    localStorage.setItem("figma_access_token", figmaToken.trim());
    localStorage.setItem("figma_compare_url", figmaUrl);

    try {
      const { fileKey, nodeId } = parsed;
      const apiUrl = `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`;

      // 재시도 로직
      const maxRetries = 3;
      let res: Response | null = null;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) {
          const delay = attempt * 30000;
          setFigmaError(`Rate limit — ${delay / 1000}초 대기 중 (${attempt}/${maxRetries})...`);
          await new Promise((r) => setTimeout(r, delay));
          setFigmaError("");
        }
        res = await fetch(apiUrl, { headers: { "X-Figma-Token": figmaToken.trim() } });
        if (res.status !== 429) break;
      }

      if (!res || !res.ok) {
        const errBody = await res?.text().catch(() => "") || "";
        let errData: Record<string, string> = {};
        try { errData = JSON.parse(errBody); } catch { /* */ }
        const errMsg = errData?.message || errData?.err || "";
        if (res?.status === 429 || errMsg.toLowerCase().includes("rate limit")) {
          throw new Error("Figma API Rate Limit. 수동 복사 탭을 사용해주세요.");
        }
        throw new Error(`Figma 오류 (${res?.status}): ${errMsg || "접근 실패"}`);
      }

      const data = await res.json();
      const nodeData = data.nodes?.[nodeId];
      if (!nodeData?.document) throw new Error("노드를 찾을 수 없습니다.");

      const document = nodeData.document as FigmaNode;
      const frames = extractFrameGroups(document);
      const allTexts = extractTextFromNodes(document);

      // 전체 프레임 데이터를 하나의 텍스트로 결합
      let fullText = "";
      if (frames.length > 0) {
        fullText = frames
          .map((f) => `[프레임: ${f.frameName}]\n${f.texts.join("\n")}`)
          .join("\n\n");
      } else {
        fullText = allTexts.join("\n");
      }

      if (!fullText.trim()) throw new Error("텍스트를 추출할 수 없습니다.");

      setReqText(fullText);
      setFigmaPageName(`${document.name} (${frames.length}개 프레임, ${fullText.length}자)`);
    } catch (err) {
      setFigmaError(err instanceof Error ? err.message : "Figma 추출 실패");
    } finally {
      setFigmaLoading(false);
    }
  }, [figmaUrl, figmaToken]);

  // ===== 비교 실행 =====
  const handleCompare = useCallback(async () => {
    if (!tcText.trim()) { setError("TC 데이터를 입력해주세요."); return; }
    if (!reqText.trim()) { setError("기획서 내용을 입력해주세요."); return; }
    if (!apiKey.trim()) { setError("API 키를 먼저 입력해주세요."); return; }

    setIsLoading(true);
    setError("");
    setResult(null);
    setProgress({ percent: 0, message: "준비 중..." });

    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tcText, requirementText: reqText, apiKey, provider }),
      });

      if (!res.body) throw new Error("스트리밍 미지원");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
          const message = buffer.slice(0, boundary).trim();
          buffer = buffer.slice(boundary + 2);

          if (message.startsWith("data: ")) {
            try {
              const data = JSON.parse(message.slice(6));
              if (data.type === "progress") {
                setProgress({ percent: data.percent, message: data.message });
              } else if (data.type === "result") {
                setProgress({ percent: 100, message: "완료!" });
                setResult(data.data);
              } else if (data.type === "error") {
                throw new Error(data.error);
              }
            } catch (parseErr) {
              if (parseErr instanceof SyntaxError) { buffer = message + "\n\n" + buffer; break; }
              if (parseErr instanceof Error && !parseErr.message.includes("Unexpected end")) throw parseErr;
            }
          }
          boundary = buffer.indexOf("\n\n");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "비교 분석 오류");
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  }, [tcText, reqText, apiKey, provider, setIsLoading]);

  const tcTokens = Math.ceil(tcText.length / 2);
  const reqTokens = Math.ceil(reqText.length / 2);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ===== TC 입력 ===== */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3">기존 TC</h3>
          <div className="flex gap-2 mb-3">
            <button onClick={() => setTcInputMode("excel")} className={`px-3 py-1 text-xs font-medium rounded-lg border transition ${tcInputMode === "excel" ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>Excel 업로드</button>
            <button onClick={() => setTcInputMode("url")} className={`px-3 py-1 text-xs font-medium rounded-lg border transition ${tcInputMode === "url" ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>Excel URL</button>
          </div>

          {tcInputMode === "excel" && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleExcelUpload(f); }}
              onClick={() => document.getElementById("tc-excel-input")?.click()}
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition"
            >
              <input id="tc-excel-input" type="file" accept=".xlsx" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleExcelUpload(f); }} className="hidden" />
              {tcFileName ? (
                <div>
                  <p className="text-sm font-medium text-gray-700">{tcFileName}</p>
                  {parsedSections && (
                    <p className="text-xs text-gray-500 mt-1">
                      {parsedSections.length}개 섹션, {parsedSections.reduce((s, sec) => s + sec.testCases.length, 0)}개 TC
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  <p className="mt-2 text-sm text-gray-500">Excel(.xlsx) 드래그 또는 클릭</p>
                </>
              )}
            </div>
          )}

          {tcInputMode === "url" && (
            <div className="space-y-2">
              <input
                type="text"
                value={excelUrl}
                onChange={(e) => setExcelUrl(e.target.value)}
                placeholder="Microsoft 365 Excel 공유 URL 붙여넣기"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none text-gray-900"
              />
              <button
                onClick={handleExcelUrl}
                disabled={urlLoading || !excelUrl.trim()}
                className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition flex items-center justify-center gap-2"
              >
                {urlLoading ? (
                  <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>가져오는 중...</>
                ) : "Excel 가져오기"}
              </button>
              {urlError && <p className="text-xs text-red-600 whitespace-pre-line">{urlError}</p>}
              <p className="text-xs text-gray-400">SharePoint/OneDrive 공유 링크를 입력하세요. 접근 권한이 필요합니다.</p>
            </div>
          )}

          {/* TC 파싱 결과 요약 */}
          {tcText && (
            <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
              TC 로드 완료: {tcText.length.toLocaleString()}자 · ~{tcTokens.toLocaleString()} 토큰
            </div>
          )}
        </div>

        {/* ===== 기획서 입력 ===== */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3">기획서 (요구사항)</h3>
          <div className="flex gap-2 mb-3">
            <button onClick={() => setReqInputMode("figma")} className={`px-3 py-1 text-xs font-medium rounded-lg border transition ${reqInputMode === "figma" ? "bg-purple-50 border-purple-300 text-purple-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>Figma</button>
            <button onClick={() => setReqInputMode("text")} className={`px-3 py-1 text-xs font-medium rounded-lg border transition ${reqInputMode === "text" ? "bg-purple-50 border-purple-300 text-purple-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>수동 복사</button>
          </div>

          {reqInputMode === "figma" && (
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Figma Access Token</label>
                <input
                  type="password"
                  value={figmaToken}
                  onChange={(e) => { setFigmaToken(e.target.value.trim()); localStorage.setItem("figma_access_token", e.target.value.trim()); }}
                  placeholder="figd_xxxx..."
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Figma 페이지 URL (전체 페이지)</label>
                <input
                  type="text"
                  value={figmaUrl}
                  onChange={(e) => setFigmaUrl(e.target.value)}
                  placeholder="https://www.figma.com/design/xxxxx/Name?node-id=0-1"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none text-gray-900"
                />
              </div>
              <button
                onClick={handleFigmaExtract}
                disabled={figmaLoading || !figmaUrl.trim()}
                className="w-full py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition flex items-center justify-center gap-2"
              >
                {figmaLoading ? (
                  <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>추출 중...</>
                ) : "전체 페이지 추출"}
              </button>
              {figmaError && <p className="text-xs text-red-600 whitespace-pre-line">{figmaError}</p>}
              {figmaPageName && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
                  {figmaPageName}
                </div>
              )}
            </div>
          )}

          {reqInputMode === "text" && (
            <div>
              <textarea
                value={reqText}
                onChange={(e) => setReqText(e.target.value)}
                placeholder={"Figma에서 Ctrl+A → Ctrl+C로 전체 텍스트를 복사해서 붙여넣으세요.\n\n또는 기획서의 Description 내용을 붙여넣으세요."}
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none resize-y text-gray-900"
              />
            </div>
          )}

          {/* 기획서 로드 상태 */}
          {reqText && reqInputMode === "text" && (
            <div className="mt-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
              기획서 로드: {reqText.length.toLocaleString()}자 · ~{reqTokens.toLocaleString()} 토큰
            </div>
          )}
        </div>
      </div>

      {/* 토큰 요약 + 비교 버튼 */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          총 ~{(tcTokens + reqTokens).toLocaleString()} 토큰 예상
          {tcTokens + reqTokens > 10000 && <span className="text-amber-600 ml-2">⚠ 토큰 사용량 높음</span>}
        </div>
        <button
          onClick={handleCompare}
          disabled={isLoading || !tcText.trim() || !reqText.trim()}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition"
        >
          {isLoading ? (
            <><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>분석 중...</>
          ) : "비교 분석하기"}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>}

      {isLoading && progress && <ProgressDisplay percent={progress.percent} message={progress.message} stage="generating" />}

      {/* ===== 비교 결과 ===== */}
      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label="전체 요구사항" value={result.summary.totalRequirements} />
            <SummaryCard label="커버율" value={`${result.summary.coveragePercent}%`} color={result.summary.coveragePercent >= 80 ? "green" : result.summary.coveragePercent >= 50 ? "amber" : "red"} />
            <SummaryCard label="누락 TC" value={result.summary.missingTCCount} color={result.summary.missingTCCount > 0 ? "red" : "green"} />
            <SummaryCard label="누락 예외케이스" value={result.summary.missingExceptionCount} color={result.summary.missingExceptionCount > 0 ? "amber" : "green"} />
          </div>

          {result.missingTCs.length > 0 && <GapSection title="누락된 TC" items={result.missingTCs} colorClass="red" />}
          {result.missingExceptions.length > 0 && <GapSection title="누락된 예외 케이스" items={result.missingExceptions} colorClass="amber" />}

          {result.coverageMatrix.length > 0 && (
            <div className="bg-white rounded-xl border p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">커버리지 매트릭스</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">요구사항</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">매핑 TC</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-600 w-24">커버리지</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.coverageMatrix.map((item, i) => (
                      <tr key={i} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-800">{item.requirement}</td>
                        <td className="px-3 py-2 text-gray-600 text-xs font-mono">{item.matchedTCs.join(", ") || "-"}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.coverage === "full" ? "bg-green-100 text-green-700" :
                            item.coverage === "partial" ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {item.coverage === "full" ? "완전" : item.coverage === "partial" ? "부분" : "미커버"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  const bg = color === "green" ? "bg-green-50 border-green-200" : color === "red" ? "bg-red-50 border-red-200" : color === "amber" ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200";
  const textColor = color === "green" ? "text-green-700" : color === "red" ? "text-red-700" : color === "amber" ? "text-amber-700" : "text-gray-700";
  return (
    <div className={`rounded-lg border p-3 ${bg}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
    </div>
  );
}

function GapSection({ title, items, colorClass }: {
  title: string;
  items: { requirement: string; severity: string; suggestedProcedure: string; suggestedExpectedResult: string }[];
  colorClass: string;
}) {
  const border = colorClass === "red" ? "border-red-200" : "border-amber-200";
  const bg = colorClass === "red" ? "bg-red-50" : "bg-amber-50";
  const titleColor = colorClass === "red" ? "text-red-800" : "text-amber-800";
  return (
    <div className={`rounded-xl border ${border} ${bg} p-4`}>
      <h3 className={`text-sm font-bold ${titleColor} mb-3`}>{title} ({items.length}건)</h3>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="bg-white rounded-lg border p-3">
            <div className="flex items-start justify-between mb-2">
              <p className="text-sm font-medium text-gray-800">{item.requirement}</p>
              <span className={`shrink-0 ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                item.severity === "high" ? "bg-red-100 text-red-700" :
                item.severity === "medium" ? "bg-amber-100 text-amber-700" :
                "bg-gray-100 text-gray-600"
              }`}>{item.severity === "high" ? "높음" : item.severity === "medium" ? "중간" : "낮음"}</span>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <p><span className="font-medium text-gray-700">제안 절차:</span> {item.suggestedProcedure}</p>
              <p><span className="font-medium text-gray-700">제안 결과:</span> {item.suggestedExpectedResult}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
