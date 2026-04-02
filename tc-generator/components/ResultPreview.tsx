"use client";

import { TestSection } from "@/lib/types";
import { useState, useEffect } from "react";

interface Props {
  sections: TestSection[];
  functionName: string;
  onDownload: () => void;
  isDownloading: boolean;
  onRegenerate: (feedback: string) => void;
  isLoading: boolean;
}

function TCTable({
  sections,
  expandedSections,
  toggleSection,
  compact,
}: {
  sections: TestSection[];
  expandedSections: Set<number>;
  toggleSection: (i: number) => void;
  compact?: boolean;
}) {
  // docInfo 또는 docPage가 하나라도 있으면 컬럼 표시
  const hasDocInfo = sections.some((s) =>
    s.testCases.some((tc) => tc.docInfo || tc.docPage)
  );

  return (
    <div className="border rounded-lg overflow-hidden">
      {sections.map((section, sIdx) => (
        <div key={sIdx}>
          <button
            onClick={() => toggleSection(sIdx)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
          >
            <span>
              {section.storyId} - {section.sectionTitle}
            </span>
            <div className="flex items-center gap-2">
              <span className="bg-blue-500 px-2 py-0.5 rounded text-xs">
                {section.testCases.length}건
              </span>
              <svg
                className={`h-4 w-4 transition-transform ${expandedSections.has(sIdx) ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </button>

          {expandedSections.has(sIdx) && (
            <div className="overflow-x-auto">
              <table className={`w-full ${compact ? "text-xs" : "text-sm"}`}>
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 w-8">
                      #
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 min-w-[120px]">
                      분류
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 min-w-[100px]">
                      사전조건
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 min-w-[200px]">
                      테스트 절차
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 min-w-[200px]">
                      기대 결과
                    </th>
                    {hasDocInfo && (
                      <th className="px-3 py-2 text-left font-medium text-gray-600 min-w-[100px]">
                        Doc info
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {section.testCases.map((tc, tIdx) => (
                    <tr
                      key={tIdx}
                      className="border-t hover:bg-gray-50 align-top"
                    >
                      <td className="px-3 py-2 text-gray-400">{tIdx + 1}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {[
                            tc.depth1,
                            tc.depth2,
                            tc.depth3,
                            tc.depth4,
                            tc.depth5,
                          ]
                            .filter(Boolean)
                            .map((d, i) => (
                              <span
                                key={i}
                                className="inline-block bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded text-xs"
                              >
                                {d}
                              </span>
                            ))}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {tc.precondition || "-"}
                      </td>
                      <td className="px-3 py-2 text-gray-800 whitespace-pre-line">
                        {tc.procedure}
                      </td>
                      <td className="px-3 py-2 text-gray-800 whitespace-pre-line">
                        {tc.expectedResult}
                      </td>
                      {hasDocInfo && (
                        <td className="px-3 py-2 text-blue-600 text-xs font-mono">
                          {tc.docInfo || tc.docPage || "-"}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ResultPreview({
  sections,
  functionName,
  onDownload,
  isDownloading,
  onRegenerate,
  isLoading,
}: Props) {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set(sections.map((_, i) => i))
  );
  const [modalExpandedSections, setModalExpandedSections] = useState<
    Set<number>
  >(new Set(sections.map((_, i) => i)));
  const [feedback, setFeedback] = useState("");
  const [showFullscreen, setShowFullscreen] = useState(false);

  // sections 변경 시 expandedSections 초기화
  useEffect(() => {
    setExpandedSections(new Set(sections.map((_, i) => i)));
    setModalExpandedSections(new Set(sections.map((_, i) => i)));
  }, [sections]);

  const totalTCs = sections.reduce((sum, s) => sum + s.testCases.length, 0);

  const toggleSection = (index: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleModalSection = (index: number) => {
    setModalExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleRegenerate = () => {
    if (!feedback.trim()) return;
    onRegenerate(feedback.trim());
    setFeedback("");
  };

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowFullscreen(false);
    };
    if (showFullscreen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [showFullscreen]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{functionName}</h3>
          <p className="text-sm text-gray-500">
            {sections.length}개 섹션, 총 {totalTCs}개 TC
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* 전체화면 보기 버튼 */}
          <button
            onClick={() => setShowFullscreen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition"
            title="전체화면으로 보기"
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
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
            크게 보기
          </button>
          {/* Excel 다운로드 버튼 */}
          <button
            onClick={onDownload}
            disabled={isDownloading}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition"
          >
            {isDownloading ? (
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
                다운로드 중...
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
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Excel
              </>
            )}
          </button>
        </div>
      </div>

      {/* 축약 TC 테이블 */}
      <div className="max-h-[400px] overflow-y-auto">
        <TCTable
          sections={sections}
          expandedSections={expandedSections}
          toggleSection={toggleSection}
          compact
        />
      </div>

      {/* 재생성 요청 영역 */}
      <div className="border-t pt-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
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
            결과가 만족스럽지 않나요? 재생성 요청
          </h4>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="예: 경계값 테스트를 더 추가해주세요, 로그인 실패 케이스를 세분화해주세요, 비밀번호 정책 관련 TC가 부족합니다..."
            rows={2}
            className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none resize-none bg-white text-gray-900 placeholder-gray-400"
            disabled={isLoading}
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-amber-600">
              이전 결과를 참고하여 피드백을 반영한 TC를 새로 생성합니다
            </p>
            <button
              onClick={handleRegenerate}
              disabled={isLoading || !feedback.trim()}
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
      </div>

      {/* 전체화면 모달 */}
      {showFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl my-4 flex flex-col max-h-[95vh]">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50 rounded-t-2xl shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {functionName}
                </h2>
                <p className="text-sm text-gray-500">
                  {sections.length}개 섹션, 총 {totalTCs}개 TC
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onDownload}
                  disabled={isDownloading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition"
                >
                  {isDownloading ? (
                    "다운로드 중..."
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
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Excel 다운로드
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowFullscreen(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition"
                  title="닫기 (ESC)"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* 모달 본문 - TC 테이블 */}
            <div className="flex-1 overflow-y-auto p-6">
              <TCTable
                sections={sections}
                expandedSections={modalExpandedSections}
                toggleSection={toggleModalSection}
              />
            </div>

            {/* 모달 하단 - 재생성 */}
            <div className="border-t bg-gray-50 px-6 py-4 rounded-b-2xl shrink-0">
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    재생성 요청
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="수정/보완할 내용을 입력하세요..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none resize-none text-gray-900"
                    disabled={isLoading}
                  />
                </div>
                <button
                  onClick={() => {
                    handleRegenerate();
                    setShowFullscreen(false);
                  }}
                  disabled={isLoading || !feedback.trim()}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition whitespace-nowrap mb-0.5"
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
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  재생성
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
