"use client";

import { useState, useCallback, useEffect } from "react";
import { ComparisonResult, ParsedTCSection } from "@/lib/types";
import { parseExcelTC, formatTCsForComparison } from "@/lib/excel-parser";
import ProgressDisplay from "./ProgressDisplay";

interface SavedLearnData {
  name: string;
  text: string;
  savedAt: number;
}

interface Props {
  apiKey: string;
  provider: string;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
}

function getSavedLearnList(): SavedLearnData[] {
  try {
    return JSON.parse(localStorage.getItem("figma_learn_list") || "[]");
  } catch { return []; }
}

export default function CompareView({ apiKey, provider, isLoading, setIsLoading }: Props) {
  // TC 입력
  const [tcInputMode, setTcInputMode] = useState<"excel" | "text">("excel");
  const [tcText, setTcText] = useState("");
  const [tcFileName, setTcFileName] = useState("");
  const [parsedSections, setParsedSections] = useState<ParsedTCSection[] | null>(null);

  // 기획서 입력
  const [reqInputMode, setReqInputMode] = useState<"learn" | "text">("learn");
  const [reqText, setReqText] = useState("");
  const [savedList, setSavedList] = useState<SavedLearnData[]>([]);

  // 결과
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<{ percent: number; message: string } | null>(null);

  useEffect(() => {
    setSavedList(getSavedLearnList());
  }, []);

  // Excel 업로드
  const handleExcelUpload = useCallback(async (file: File) => {
    try {
      const sections = await parseExcelTC(file);
      setParsedSections(sections);
      setTcFileName(file.name);
      const totalTCs = sections.reduce((s, sec) => s + sec.testCases.length, 0);
      setTcText(formatTCsForComparison(sections));
      setError("");
      alert(`${sections.length}개 섹션, ${totalTCs}개 TC 파싱 완료`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Excel 파싱 실패");
    }
  }, []);

  // 학습 데이터 불러오기
  const handleLoadLearn = (item: SavedLearnData) => {
    setReqText(item.text);
    setReqInputMode("text");
  };

  // 비교 실행
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

      if (!res.body) throw new Error("스트리밍을 지원하지 않는 응답입니다.");

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
              if (parseErr instanceof SyntaxError) {
                buffer = message + "\n\n" + buffer;
                break;
              }
              if (parseErr instanceof Error && !parseErr.message.includes("Unexpected end")) {
                throw parseErr;
              }
            }
          }
          boundary = buffer.indexOf("\n\n");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "비교 분석 중 오류 발생");
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  }, [tcText, reqText, apiKey, provider, setIsLoading]);

  const tcTokens = Math.ceil(tcText.length / 2);
  const reqTokens = Math.ceil(reqText.length / 2);

  return (
    <div className="space-y-6">
      {/* 두 패널 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* === TC 입력 === */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3">기존 TC</h3>
          <div className="flex gap-2 mb-3">
            <button onClick={() => setTcInputMode("excel")} className={`px-3 py-1 text-xs font-medium rounded-lg border transition ${tcInputMode === "excel" ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>Excel 업로드</button>
            <button onClick={() => setTcInputMode("text")} className={`px-3 py-1 text-xs font-medium rounded-lg border transition ${tcInputMode === "text" ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>텍스트 붙여넣기</button>
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
                  <p className="mt-2 text-sm text-gray-500">Excel(.xlsx) 파일을 드래그하거나 클릭</p>
                </>
              )}
            </div>
          )}

          {tcInputMode === "text" && (
            <div>
              <textarea
                value={tcText}
                onChange={(e) => setTcText(e.target.value)}
                placeholder={"기존 TC를 붙여넣으세요.\n\n예:\n[TC_001] 로그인 > 화면 구성\n  절차: 1. 로그인 페이지에 접속한다.\n  기대결과: 로그인 페이지가 노출된다."}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none resize-y text-gray-900 font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">{tcText.length.toLocaleString()}자 · ~{tcTokens.toLocaleString()} 토큰</p>
            </div>
          )}
        </div>

        {/* === 기획서 입력 === */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3">기획서 (요구사항)</h3>
          <div className="flex gap-2 mb-3">
            <button onClick={() => setReqInputMode("learn")} className={`px-3 py-1 text-xs font-medium rounded-lg border transition ${reqInputMode === "learn" ? "bg-purple-50 border-purple-300 text-purple-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>학습 데이터</button>
            <button onClick={() => setReqInputMode("text")} className={`px-3 py-1 text-xs font-medium rounded-lg border transition ${reqInputMode === "text" ? "bg-purple-50 border-purple-300 text-purple-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>텍스트 붙여넣기</button>
          </div>

          {reqInputMode === "learn" && (
            <div>
              {savedList.length > 0 ? (
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {savedList.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => handleLoadLearn(item)}
                      className="w-full text-left px-3 py-2 text-sm bg-gray-50 rounded-lg border hover:border-purple-400 hover:bg-purple-50 transition"
                    >
                      <span className="font-mono text-purple-700 font-medium">{item.name}</span>
                      <span className="text-gray-400 ml-2">({item.text.length}자)</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-gray-400">
                  저장된 학습 데이터가 없습니다.<br />
                  Figma 탭에서 먼저 데이터를 추출하고 저장하세요.
                </div>
              )}
            </div>
          )}

          {reqInputMode === "text" && (
            <div>
              <textarea
                value={reqText}
                onChange={(e) => setReqText(e.target.value)}
                placeholder={"Figma 디스크립션 또는 기획서 내용을 붙여넣으세요.\n\n예:\n화면정의\n• 아이디와 비밀번호를 입력하여 로그인하는 화면\n\n정책\n• 비밀번호 5회 연속 오류 시 계정 잠금 (30분)"}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none resize-y text-gray-900"
              />
              <p className="text-xs text-gray-400 mt-1">{reqText.length.toLocaleString()}자 · ~{reqTokens.toLocaleString()} 토큰</p>
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

      {/* 에러 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
      )}

      {/* 진행률 */}
      {isLoading && progress && (
        <ProgressDisplay percent={progress.percent} message={progress.message} stage="generating" />
      )}

      {/* === 비교 결과 === */}
      {result && (
        <div className="space-y-4">
          {/* 요약 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label="전체 요구사항" value={result.summary.totalRequirements} />
            <SummaryCard label="커버율" value={`${result.summary.coveragePercent}%`} color={result.summary.coveragePercent >= 80 ? "green" : result.summary.coveragePercent >= 50 ? "amber" : "red"} />
            <SummaryCard label="누락 TC" value={result.summary.missingTCCount} color={result.summary.missingTCCount > 0 ? "red" : "green"} />
            <SummaryCard label="누락 예외케이스" value={result.summary.missingExceptionCount} color={result.summary.missingExceptionCount > 0 ? "amber" : "green"} />
          </div>

          {/* 누락 TC */}
          {result.missingTCs.length > 0 && (
            <GapSection title="누락된 TC" items={result.missingTCs} colorClass="red" />
          )}

          {/* 누락 예외 케이스 */}
          {result.missingExceptions.length > 0 && (
            <GapSection title="누락된 예외 케이스" items={result.missingExceptions} colorClass="amber" />
          )}

          {/* 커버리지 매트릭스 */}
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
