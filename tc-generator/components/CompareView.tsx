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
  const [tcParsing, setTcParsing] = useState(false);
  const [tcParseProgress, setTcParseProgress] = useState("");
  const [selectedSections, setSelectedSections] = useState<Set<number>>(new Set());

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
  const [compareInfo, setCompareInfo] = useState<{ sections: string[]; tcCount: number; tokenEstimate: number } | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("figma_access_token");
    if (savedToken) setFigmaToken(savedToken);
    const savedUrl = localStorage.getItem("figma_compare_url");
    if (savedUrl) setFigmaUrl(savedUrl);
    const savedExcelUrl = localStorage.getItem("compare_excel_url");
    if (savedExcelUrl) setExcelUrl(savedExcelUrl);

    // 캐시된 TC 데이터 복원
    const cachedTC = localStorage.getItem("compare_tc_cache");
    if (cachedTC) {
      try {
        const cached = JSON.parse(cachedTC);
        setTcText(cached.text);
        setTcFileName(cached.fileName + " (캐시)");
        setParsedSections(cached.sections);
        setSelectedSections(new Set((cached.sections as unknown[]).map((_: unknown, i: number) => i)));
      } catch { /* */ }
    }
  }, []);

  // ===== TC: Excel 업로드 =====
  const handleExcelUpload = useCallback(async (file: File) => {
    setTcParsing(true);
    setTcParseProgress("Excel 파일 읽는 중...");
    setError("");

    try {
      // 약간의 딜레이로 UI 렌더링 보장
      await new Promise((r) => setTimeout(r, 50));
      setTcParseProgress("시트 분석 중...");
      await new Promise((r) => setTimeout(r, 50));

      const sections = await parseExcelTC(file);
      setTcParseProgress("TC 데이터 변환 중...");
      await new Promise((r) => setTimeout(r, 50));

      const text = formatTCsForComparison(sections);
      const totalTCs = sections.reduce((s, sec) => s + sec.testCases.length, 0);

      setParsedSections(sections);
      setTcFileName(file.name);
      setTcText(text);
      setSelectedSections(new Set(sections.map((_, i) => i))); // 전체 선택
      setTcParseProgress(`완료! ${sections.length}개 섹션, ${totalTCs}개 TC`);

      // 캐시 저장
      try {
        localStorage.setItem("compare_tc_cache", JSON.stringify({
          text,
          fileName: file.name,
          sections,
          savedAt: Date.now(),
        }));
      } catch { /* localStorage full */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Excel 파싱 실패");
      setTcParseProgress("");
    } finally {
      setTcParsing(false);
    }
  }, []);

  // ===== TC: Microsoft 365 Excel URL =====
  // SharePoint URL → download.aspx 변환 (브라우저 인증 세션 활용)
  function convertToDownloadUrl(url: string): string {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname;

      // SharePoint /:x:/r/ 패턴
      if (hostname.includes("sharepoint.com")) {
        const pathMatch = parsed.pathname.match(/\/:x:\/[rg]\/(.+)/);
        if (pathMatch) {
          const filePath = "/" + pathMatch[1];
          const baseMatch = filePath.match(/^(\/personal\/[^/]+)/);
          if (baseMatch) {
            return `https://${hostname}${baseMatch[1]}/_layouts/15/download.aspx?SourceUrl=${encodeURIComponent(filePath)}`;
          }
        }
      }
      return url + (url.includes("?") ? "&" : "?") + "download=1";
    } catch {
      return url;
    }
  }

  const handleExcelUrl = useCallback(async () => {
    if (!excelUrl.trim()) return;
    setUrlLoading(true);
    setUrlError("");
    localStorage.setItem("compare_excel_url", excelUrl);

    try {
      // 브라우저에서 직접 다운로드 (SharePoint 인증 세션 활용)
      const downloadUrl = convertToDownloadUrl(excelUrl);

      const res = await fetch(downloadUrl, {
        credentials: "include", // 쿠키 포함 → SharePoint 인증
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error(
            "접근 권한이 없습니다.\n\n" +
            "대안: Excel Online에서 파일 → 복사본 다운로드 → Excel 업로드"
          );
        }
        throw new Error(`다운로드 실패 (${res.status})`);
      }

      const blob = await res.blob();

      // ZIP 시그니처 확인 (XLSX = ZIP)
      const header = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
      if (header[0] !== 0x50 || header[1] !== 0x4B) {
        throw new Error(
          "Excel 파일이 아닌 응답입니다.\n\n" +
          "대안: Excel Online에서 파일 → 복사본 다운로드 → Excel 업로드"
        );
      }

      const file = new File([blob], "online.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      await handleExcelUpload(file);
    } catch (err) {
      // CORS 에러 등으로 fetch 자체가 실패하면 서버 프록시로 폴백
      if (err instanceof TypeError && err.message.includes("fetch")) {
        try {
          const res = await fetch("/api/fetch-excel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: excelUrl }),
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `서버 프록시 실패 (${res.status})`);
          }
          const blob = await res.blob();
          const file = new File([blob], "online.xlsx", { type: blob.type });
          await handleExcelUpload(file);
          return;
        } catch (proxyErr) {
          setUrlError(proxyErr instanceof Error ? proxyErr.message : "다운로드 실패");
          return;
        }
      }
      setUrlError(
        err instanceof Error ? err.message :
        "Excel 파일을 가져올 수 없습니다.\n직접 다운로드 후 업로드해주세요."
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

  // 선택된 섹션만 필터링한 TC 텍스트 생성
  const getFilteredTCText = useCallback(() => {
    if (!parsedSections || selectedSections.size === parsedSections.length) {
      return tcText; // 전체 선택이면 원본 그대로
    }
    const filtered = parsedSections.filter((_, i) => selectedSections.has(i));
    return formatTCsForComparison(filtered);
  }, [parsedSections, selectedSections, tcText]);

  // ===== 비교 실행 =====
  const handleCompare = useCallback(async () => {
    const filteredTC = getFilteredTCText();
    if (!filteredTC.trim()) { setError("TC 데이터를 입력해주세요."); return; }
    if (!reqText.trim()) { setError("기획서 내용을 입력해주세요."); return; }
    if (!apiKey.trim()) { setError("API 키를 먼저 입력해주세요."); return; }

    // 비교 정보 저장 (결과에 표시용)
    const sectionNames = parsedSections
      ? parsedSections.filter((_, i) => selectedSections.has(i)).map((s) => s.sectionTitle)
      : ["전체"];
    const filteredTCCount = parsedSections
      ? parsedSections.filter((_, i) => selectedSections.has(i)).reduce((s, sec) => s + sec.testCases.length, 0)
      : 0;

    setCompareInfo({
      sections: sectionNames,
      tcCount: filteredTCCount,
      tokenEstimate: Math.ceil((filteredTC.length + reqText.length) / 2),
    });

    setIsLoading(true);
    setError("");
    setResult(null);
    setProgress({ percent: 0, message: "준비 중..." });

    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tcText: filteredTC, requirementText: reqText, apiKey, provider }),
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
  }, [getFilteredTCText, reqText, apiKey, provider, setIsLoading, parsedSections, selectedSections]);

  const filteredTCPreview = getFilteredTCText();
  const tcTokens = Math.ceil(filteredTCPreview.length / 2);
  const reqTokens = Math.ceil(reqText.length / 2);
  const selectedTCCount = parsedSections
    ? parsedSections.filter((_, i) => selectedSections.has(i)).reduce((s, sec) => s + sec.testCases.length, 0)
    : 0;
  const totalTCCount = parsedSections
    ? parsedSections.reduce((s, sec) => s + sec.testCases.length, 0)
    : 0;

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
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f && !tcParsing) handleExcelUpload(f); }}
              onClick={() => { if (!tcParsing) document.getElementById("tc-excel-input")?.click(); }}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition ${tcParsing ? "border-blue-400 bg-blue-50 cursor-wait" : "cursor-pointer hover:border-blue-400"}`}
            >
              <input id="tc-excel-input" type="file" accept=".xlsx" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleExcelUpload(f); }} className="hidden" />
              {tcParsing ? (
                <div className="flex flex-col items-center gap-2">
                  <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-sm text-blue-600 font-medium">{tcParseProgress}</p>
                </div>
              ) : tcFileName ? (
                <div>
                  <p className="text-sm font-medium text-gray-700">{tcFileName}</p>
                  {parsedSections && (
                    <p className="text-xs text-gray-500 mt-1">
                      {parsedSections.length}개 섹션, {parsedSections.reduce((s, sec) => s + sec.testCases.length, 0)}개 TC
                    </p>
                  )}
                  <p className="text-xs text-blue-500 mt-1">다시 업로드하려면 클릭</p>
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
          {tcText && !tcParsing && (
            <div className="mt-3 space-y-2">
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-green-700">
                  TC 로드: {selectedTCCount}/{totalTCCount}개 TC 선택 · ~{tcTokens.toLocaleString()} 토큰
                  {tcFileName.includes("캐시") && " (캐시)"}
                </span>
                <button
                  onClick={() => {
                    setTcText("");
                    setTcFileName("");
                    setParsedSections(null);
                    setSelectedSections(new Set());
                    localStorage.removeItem("compare_tc_cache");
                  }}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  초기화
                </button>
              </div>

              {/* 섹션 필터링 체크박스 */}
              {parsedSections && parsedSections.length > 1 && (
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-700">비교할 섹션 선택</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedSections(new Set(parsedSections.map((_, i) => i)))}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >전체 선택</button>
                      <button
                        onClick={() => setSelectedSections(new Set())}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >전체 해제</button>
                    </div>
                  </div>
                  {parsedSections.map((sec, i) => (
                    <label key={i} className="flex items-center gap-2 py-1 text-xs cursor-pointer hover:bg-gray-50 rounded px-1">
                      <input
                        type="checkbox"
                        checked={selectedSections.has(i)}
                        onChange={() => {
                          setSelectedSections((prev) => {
                            const next = new Set(prev);
                            next.has(i) ? next.delete(i) : next.add(i);
                            return next;
                          });
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">{sec.sectionTitle}</span>
                      <span className="text-gray-400">({sec.testCases.length}건)</span>
                    </label>
                  ))}
                </div>
              )}
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

      {/* 샘플 데이터 */}
      {!tcText.trim() && !reqText.trim() && (
        <div className="border border-dashed border-gray-300 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500">샘플 데이터로 비교 테스트</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setTcText(COMPARE_SAMPLE_LOGIN.tc);
                setReqText(COMPARE_SAMPLE_LOGIN.req);
                setTcFileName("로그인 TC (샘플)");
                setParsedSections(null);
              }}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 border border-gray-200 hover:border-indigo-300 transition"
            >
              로그인 비교
            </button>
            <button
              type="button"
              onClick={() => {
                setTcText(COMPARE_SAMPLE_BOARD.tc);
                setReqText(COMPARE_SAMPLE_BOARD.req);
                setTcFileName("게시판 TC (샘플)");
                setParsedSections(null);
              }}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 border border-gray-200 hover:border-indigo-300 transition"
            >
              게시판 비교
            </button>
          </div>
        </div>
      )}

      {/* 토큰 요약 + 비교 버튼 */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          TC {selectedTCCount}/{totalTCCount}건 선택 · 총 ~{(tcTokens + reqTokens).toLocaleString()} 토큰 예상
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
          {/* 비교 정보 배너 */}
          {compareInfo && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-indigo-800">비교 분석 결과</span>
                <span className="text-xs text-indigo-600">
                  {compareInfo.tcCount}개 TC · ~{compareInfo.tokenEstimate.toLocaleString()} 토큰 사용
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {compareInfo.sections.map((s, i) => (
                  <span key={i} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label="전체 요구사항" value={result.summary.totalRequirements} />
            <SummaryCard label="커버율" value={`${result.summary.coveragePercent}%`} color={result.summary.coveragePercent >= 80 ? "green" : result.summary.coveragePercent >= 50 ? "amber" : "red"} />
            <SummaryCard label="누락 TC (기획서)" value={result.summary.missingTCCount} color={result.summary.missingTCCount > 0 ? "red" : "green"} />
            <SummaryCard label="예외 케이스 (QA)" value={result.summary.missingExceptionCount} color={result.summary.missingExceptionCount > 0 ? "amber" : "green"} />
          </div>

          {result.missingTCs.length > 0 && <GapSection title="누락된 TC (기획서에 명시된 요구사항)" subtitle="기획서에 작성되어 있지만 TC로 커버되지 않은 항목" items={result.missingTCs} colorClass="red" />}
          {result.missingExceptions.length > 0 && <GapSection title="예외 케이스 제안 (QA 추론)" subtitle="기획서에 명시되지 않았지만 QA 관점에서 테스트가 필요한 항목" items={result.missingExceptions} colorClass="amber" />}

          {result.coverageMatrix.length > 0 && (
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900">커버리지 매트릭스</h3>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400"></span>완전</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span>부분</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400"></span>미커버</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-700 w-8">#</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-700">요구사항</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-700">매핑 TC</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-gray-700 w-24">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.coverageMatrix.map((item, i) => (
                      <tr key={i} className={`border-t hover:bg-gray-50 ${item.coverage === "none" ? "bg-red-50/30" : ""}`}>
                        <td className="px-3 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-3 py-2.5 text-gray-800 text-sm">{item.requirement}</td>
                        <td className="px-3 py-2.5">
                          {item.matchedTCs.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {item.matchedTCs.map((tc, ti) => (
                                <span key={ti} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono">{tc}</span>
                              ))}
                            </div>
                          ) : <span className="text-xs text-red-400">-</span>}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
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
  const bg = color === "green" ? "bg-green-50 border-green-200" : color === "red" ? "bg-red-50 border-red-200" : color === "amber" ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200";
  const textColor = color === "green" ? "text-green-700" : color === "red" ? "text-red-700" : color === "amber" ? "text-amber-700" : "text-gray-900";
  const icon = color === "green" ? "text-green-400" : color === "red" ? "text-red-400" : color === "amber" ? "text-amber-400" : "text-gray-400";
  return (
    <div className={`rounded-xl border p-4 ${bg} shadow-sm`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <span className={`text-lg ${icon}`}>
          {color === "green" ? "\u2713" : color === "red" ? "\u2717" : color === "amber" ? "\u26A0" : "\u2022"}
        </span>
      </div>
      <p className={`text-3xl font-bold ${textColor}`}>{value}</p>
    </div>
  );
}

/**
 * 절차 텍스트를 번호 기준으로 줄바꿈 처리
 * "1. xxx 2. yyy" → ["1. xxx", "2. yyy"]
 */
function formatSteps(text: string): string[] {
  if (!text) return ["-"];
  // 이미 줄바꿈이 있으면 그대로 사용
  if (text.includes("\n")) {
    return text.split("\n").filter((s) => s.trim());
  }
  // "1. " "2. " 등 번호 패턴으로 분리
  const parts = text.split(/(?=\d+\.\s)/).filter((s) => s.trim());
  return parts.length > 0 ? parts : [text];
}

function GapSection({ title, subtitle, items, colorClass }: {
  title: string;
  subtitle?: string;
  items: { requirement: string; severity: string; suggestedProcedure: string; suggestedExpectedResult: string }[];
  colorClass: string;
}) {
  const border = colorClass === "red" ? "border-red-200" : "border-amber-200";
  const bg = colorClass === "red" ? "bg-red-50" : "bg-amber-50";
  const titleColor = colorClass === "red" ? "text-red-800" : "text-amber-800";
  const subtitleColor = colorClass === "red" ? "text-red-600" : "text-amber-600";
  const accentBorder = colorClass === "red" ? "border-l-red-400" : "border-l-amber-400";

  return (
    <div className={`rounded-xl border ${border} ${bg} p-4`}>
      <h3 className={`text-sm font-bold ${titleColor}`}>{title} ({items.length}건)</h3>
      {subtitle && <p className={`text-xs ${subtitleColor} mb-3 mt-0.5`}>{subtitle}</p>}
      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className={`bg-white rounded-lg border border-l-4 ${accentBorder} p-4 shadow-sm`}>
            {/* 요구사항 + 심각도 */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-2">
                <span className="shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                <p className="text-sm font-semibold text-gray-900 leading-relaxed">{item.requirement}</p>
              </div>
              <span className={`shrink-0 ml-3 px-2.5 py-1 rounded-full text-xs font-bold ${
                item.severity === "high" ? "bg-red-100 text-red-700" :
                item.severity === "medium" ? "bg-amber-100 text-amber-700" :
                "bg-gray-100 text-gray-600"
              }`}>{item.severity === "high" ? "높음" : item.severity === "medium" ? "중간" : "낮음"}</span>
            </div>

            {/* 제안 절차 */}
            <div className="mb-3">
              <p className="text-xs font-bold text-gray-700 mb-1.5">제안 절차</p>
              <div className="bg-gray-50 rounded-lg px-3 py-2 space-y-1">
                {formatSteps(item.suggestedProcedure).map((step, si) => (
                  <p key={si} className="text-xs text-gray-700 leading-relaxed">{step.trim()}</p>
                ))}
              </div>
            </div>

            {/* 제안 결과 */}
            <div>
              <p className="text-xs font-bold text-gray-700 mb-1.5">제안 결과</p>
              <div className="bg-blue-50 rounded-lg px-3 py-2">
                <p className="text-xs text-blue-800 leading-relaxed whitespace-pre-line">{item.suggestedExpectedResult}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== 비교 샘플 데이터 =====

const COMPARE_SAMPLE_LOGIN = {
  tc: `## 로그인
[Login_001] 로그인 > 화면 구성
  절차: 1. 로그인 페이지에 접속한다.
  기대결과: 아이디 입력 필드, 비밀번호 입력 필드, [로그인] 버튼이 노출된다.
[Login_002] 로그인 > 화면 구성
  절차: 1. 로그인 페이지의 하단 영역을 확인한다.
  기대결과: [아이디 찾기], [비밀번호 찾기] 링크가 노출된다.
[Login_003] 로그인 > 정상 동작
  절차: 1. 아이디와 비밀번호를 올바르게 입력한다.\n2. [로그인] 버튼을 클릭한다.
  기대결과: 메인 페이지로 이동한다.
[Login_004] 로그인 > 입력 검증
  절차: 1. 아이디를 입력하지 않은 상태에서 [로그인] 버튼을 클릭한다.
  기대결과: '아이디를 입력해주세요.' 안내 문구가 노출된다.
[Login_005] 로그인 > 입력 검증
  절차: 1. 비밀번호를 입력하지 않은 상태에서 [로그인] 버튼을 클릭한다.
  기대결과: '비밀번호를 입력해주세요.' 안내 문구가 노출된다.
[Login_006] 로그인 > 인증 실패
  절차: 1. 잘못된 비밀번호를 입력한다.\n2. [로그인] 버튼을 클릭한다.
  기대결과: '아이디 또는 비밀번호가 일치하지 않습니다.' 오류 문구가 노출된다.
[Login_007] 로그인 > 계정 잠금
  절차: 1. 비밀번호를 5회 연속 잘못 입력한다.
  기대결과: '계정이 잠겼습니다. 30분 후 다시 시도해주세요.' 문구가 노출된다.`,

  req: `화면정의
• 아이디와 비밀번호를 입력하여 로그인하는 화면

화면 구성
• 아이디 입력 필드 (텍스트, 최대 20자)
• 비밀번호 입력 필드 (마스킹 처리, 최대 20자)
• [로그인] 버튼
• [아이디 찾기] / [비밀번호 찾기] 링크
• '아이디 저장' 체크박스
• '자동 로그인' 체크박스

로그인 동작
• 아이디와 비밀번호 입력 후 [로그인] 버튼 클릭 시 인증 처리
• 인증 성공 시 메인 페이지로 이동
• 인증 실패 시 '아이디 또는 비밀번호가 일치하지 않습니다.' 오류 문구 노출
• 아이디 미입력 시 '아이디를 입력해주세요.' 안내 문구 노출
• 비밀번호 미입력 시 '비밀번호를 입력해주세요.' 안내 문구 노출
• Enter 키 입력 시 [로그인] 버튼과 동일하게 동작

정책
• 아이디: 영문+숫자 조합, 4~20자
• 비밀번호: 영문+숫자+특수문자 조합, 8~20자
• 비밀번호 5회 연속 오류 시 계정 잠금 (30분)
• 아이디 저장 체크 시 다음 접속 시 아이디 자동 입력
• 자동 로그인 체크 시 세션 유지 (30일)
• 세션 만료 시 자동 로그아웃 후 로그인 페이지로 이동`,
};

const COMPARE_SAMPLE_BOARD = {
  tc: `## 게시판
[Board_001] 게시판 > 목록 화면
  절차: 1. 게시판 페이지에 접속한다.
  기대결과: 게시글 번호, 제목, 작성자, 작성일, 조회수 컬럼이 표시된다.
[Board_002] 게시판 > 목록 화면
  절차: 1. 게시글 목록의 페이지네이션을 확인한다.
  기대결과: 한 페이지에 10개씩 표시된다.
[Board_003] 게시판 > 게시글 작성
  절차: 1. [글쓰기] 버튼을 클릭한다.\n2. 제목과 내용을 입력한다.\n3. [등록] 버튼을 클릭한다.
  기대결과: 게시글이 저장되고 목록으로 이동한다.
[Board_004] 게시판 > 게시글 작성 > 필수값
  절차: 1. 제목을 입력하지 않고 [등록] 버튼을 클릭한다.
  기대결과: '제목을 입력해주세요.' 안내 문구가 노출된다.
[Board_005] 게시판 > 게시글 삭제
  절차: 1. 본인이 작성한 게시글의 [삭제] 버튼을 클릭한다.
  기대결과: '정말 삭제하시겠습니까?' 확인 팝업이 노출된다.
[Board_006] 게시판 > 검색
  절차: 1. 검색 필드에 키워드를 입력한다.\n2. [검색] 버튼을 클릭한다.
  기대결과: 검색 결과가 목록에 표시된다.`,

  req: `화면정의
• 게시글 목록 조회 및 게시글 작성/수정/삭제 기능을 제공하는 게시판 화면

게시글 목록
• 게시글 번호, 제목, 작성자, 작성일, 조회수 컬럼 표시
• 한 페이지에 10개씩 표시 (페이지네이션)
• [글쓰기] 버튼 → 게시글 작성 페이지로 이동
• 제목 클릭 → 게시글 상세 페이지로 이동
• 검색: 제목/내용/작성자 검색 가능

게시글 작성
• 제목 입력 (필수, 최대 100자)
• 내용 입력 (필수, 에디터 제공)
• 파일 첨부 (최대 5개, 각 10MB 이하, jpg/png/pdf/docx만 허용)
• [등록] 버튼 클릭 시 저장 후 목록으로 이동
• [취소] 버튼 클릭 시 '작성을 취소하시겠습니까?' 확인 팝업 후 목록으로 이동

게시글 수정/삭제
• 작성자 본인만 수정/삭제 가능
• 삭제 시 '정말 삭제하시겠습니까?' 확인 팝업 노출
• 관리자는 모든 게시글 삭제 가능

정책
• 비로그인 사용자: 목록 조회만 가능, 글쓰기 불가
• 제목: 필수, 1~100자
• 내용: 필수, 1~10,000자
• XSS 방지: HTML 태그 입력 시 이스케이프 처리
• 파일 업로드 시 바이러스 검사 수행`,
};
