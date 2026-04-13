"use client";

import { useState, useCallback } from "react";

interface PageEntry {
  id: string;
  name: string;
  text: string;
}

interface Props {
  onGenerate: (data: {
    functionName: string;
    description: string;
    policies: string;
  }) => void;
  isLoading: boolean;
}

function createPage(index: number): PageEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: `페이지 ${index}`,
    text: "",
  };
}

export default function TemplateForm({ onGenerate, isLoading }: Props) {
  const [functionName, setFunctionName] = useState("");
  const [inputMode, setInputMode] = useState<"single" | "multi">("single");
  const [description, setDescription] = useState("");
  const [policies, setPolicies] = useState("");

  // 다중 페이지
  const [pages, setPages] = useState<PageEntry[]>([createPage(1)]);
  const [activePageId, setActivePageId] = useState(pages[0].id);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);

  const activePage = pages.find((p) => p.id === activePageId) || pages[0];

  // 페이지 추가
  const addPage = useCallback(() => {
    const newPage = createPage(pages.length + 1);
    setPages((prev) => [...prev, newPage]);
    setActivePageId(newPage.id);
  }, [pages.length]);

  // 페이지 삭제
  const removePage = useCallback((id: string) => {
    if (pages.length <= 1) return;
    setPages((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (activePageId === id) setActivePageId(next[0].id);
      return next;
    });
  }, [pages.length, activePageId]);

  // 페이지 내용 수정
  const updatePageText = useCallback((id: string, text: string) => {
    setPages((prev) => prev.map((p) => p.id === id ? { ...p, text } : p));
  }, []);

  // 페이지 이름 수정
  const updatePageName = useCallback((id: string, name: string) => {
    setPages((prev) => prev.map((p) => p.id === id ? { ...p, name } : p));
  }, []);

  // 다중 페이지 → 합쳐진 텍스트
  const mergedDescription = inputMode === "multi"
    ? pages
        .filter((p) => p.text.trim())
        .map((p) => `[${p.name}]\n${p.text}`)
        .join("\n\n")
    : description;

  const totalChars = inputMode === "multi"
    ? pages.reduce((s, p) => s + p.text.length, 0)
    : description.length;
  const filledPages = pages.filter((p) => p.text.trim()).length;
  const totalTokens = Math.ceil((totalChars + policies.length) / 2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mergedDescription.trim()) return;
    onGenerate({
      functionName: functionName || "기능",
      description: mergedDescription,
      policies,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
        Figma 디스크립션을 페이지별로 나눠서 입력하면 AI 분석 품질이 향상됩니다.
      </div>

      {/* 기능명 */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          기능명 <span className="text-gray-400 font-normal">(선택)</span>
        </label>
        <input
          type="text"
          value={functionName}
          onChange={(e) => setFunctionName(e.target.value)}
          placeholder="예: 환자타입조회, 로그인"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
        />
      </div>

      {/* 입력 모드 토글 */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-semibold text-gray-700">디스크립션</label>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setInputMode("single")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition ${
              inputMode === "single" ? "bg-white shadow text-blue-700" : "text-gray-500"
            }`}
          >
            단일 입력
          </button>
          <button
            type="button"
            onClick={() => setInputMode("multi")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition ${
              inputMode === "multi" ? "bg-white shadow text-blue-700" : "text-gray-500"
            }`}
          >
            다중 페이지
          </button>
        </div>
      </div>

      {/* ===== 단일 입력 ===== */}
      {inputMode === "single" && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">기능 상세 설명 / 디스크립션</span>
            <span className="text-xs text-gray-400">{description.length.toLocaleString()}자</span>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={"Figma 디스크립션을 복사하여 붙여넣으세요.\n\n예:\n화면정의\n• 아이디와 비밀번호를 입력하여 로그인하는 화면\n\n화면 구성\n• 아이디 입력 필드\n• 비밀번호 입력 필드\n• [로그인] 버튼"}
            rows={10}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y text-gray-900 leading-relaxed"
          />
        </div>
      )}

      {/* ===== 다중 페이지 입력 ===== */}
      {inputMode === "multi" && (
        <div className="space-y-3">
          {/* 요약 바 */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {pages.length}개 페이지 · {filledPages}개 입력됨 · {totalChars.toLocaleString()}자
            </span>
            <span className="text-blue-500">AI가 페이지 순서를 자동으로 판단합니다</span>
          </div>

          {/* 페이지 탭 */}
          <div className="flex flex-wrap gap-1.5">
            {pages.map((page, idx) => {
              const isActive = page.id === activePageId;
              const isFilled = page.text.trim().length > 0;
              return (
                <div key={page.id} className="relative group">
                  {editingNameId === page.id ? (
                    <input
                      type="text"
                      value={page.name}
                      onChange={(e) => updatePageName(page.id, e.target.value)}
                      onBlur={() => setEditingNameId(null)}
                      onKeyDown={(e) => { if (e.key === "Enter") setEditingNameId(null); }}
                      autoFocus
                      className="px-2.5 py-1.5 text-xs font-medium border-2 border-blue-400 rounded-lg outline-none w-24 text-gray-900"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActivePageId(page.id)}
                      onDoubleClick={() => setEditingNameId(page.id)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border-2 transition flex items-center gap-1.5 ${
                        isActive
                          ? "bg-blue-50 border-blue-400 text-blue-700"
                          : isFilled
                            ? "bg-white border-gray-300 text-gray-700 hover:border-blue-300"
                            : "bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300"
                      }`}
                      title="클릭: 선택 / 더블클릭: 이름 수정"
                    >
                      {isFilled && <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>}
                      <span>{idx + 1}. {page.name}</span>
                    </button>
                  )}
                  {/* 삭제 버튼 */}
                  {pages.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removePage(page.id); }}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-xs leading-none opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                      title="페이지 삭제"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
            {/* 추가 버튼 */}
            <button
              type="button"
              onClick={addPage}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg border-2 border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition"
            >
              + 페이지 추가
            </button>
          </div>

          {/* 활성 페이지 편집기 */}
          <div className="border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between bg-gray-50 px-3 py-2 border-b">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">
                  {pages.findIndex((p) => p.id === activePageId) + 1}.
                </span>
                <input
                  type="text"
                  value={activePage.name}
                  onChange={(e) => updatePageName(activePage.id, e.target.value)}
                  className="text-sm font-semibold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none px-1 py-0.5 transition"
                  placeholder="페이지 이름"
                />
              </div>
              <span className="text-xs text-gray-400">{activePage.text.length.toLocaleString()}자</span>
            </div>
            <textarea
              value={activePage.text}
              onChange={(e) => updatePageText(activePage.id, e.target.value)}
              placeholder={`"${activePage.name}" 페이지의 디스크립션을 붙여넣으세요.\n\n예:\n화면정의\n• 진료실 환경설정 내 환자타입조회 관련 화면\n\n정책\n• ON: 스크리닝 모듈 실행\n• OFF: 스크리닝 모듈 미실행`}
              rows={8}
              className="w-full px-3 py-2 text-sm outline-none resize-y text-gray-900 leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* 주요 정책 */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-semibold text-gray-700">
            주요 정책 <span className="text-gray-400 font-normal">(선택)</span>
          </label>
          {policies.length > 0 && (
            <span className="text-xs text-gray-400">{policies.length.toLocaleString()}자</span>
          )}
        </div>
        <textarea
          value={policies}
          onChange={(e) => setPolicies(e.target.value)}
          placeholder={"추가 정책이나 예외 케이스가 있으면 입력하세요.\n\n예:\n• 비밀번호 5회 오류 시 계정 잠금 (30분)\n• 세션 만료 시 자동 로그아웃"}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y text-gray-900 leading-relaxed"
        />
      </div>

      {/* 입력 요약 */}
      {totalChars > 0 && (
        <div className="bg-gray-50 border rounded-lg px-3 py-2 flex items-center justify-between text-xs text-gray-500">
          <span>
            {inputMode === "multi" && `${filledPages}/${pages.length} 페이지 · `}
            총 {(totalChars + policies.length).toLocaleString()}자 · ~{totalTokens.toLocaleString()} 토큰
          </span>
          {totalTokens > 5000 && (
            <span className="text-amber-600">⚠ 토큰 사용량 높음</span>
          )}
        </div>
      )}

      {/* 샘플 데이터 */}
      {!mergedDescription.trim() && (
        <div className="border border-dashed border-gray-300 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500">샘플 데이터로 테스트</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setFunctionName("로그인");
                if (inputMode === "single") {
                  setDescription(SAMPLE_LOGIN_SINGLE);
                  setPolicies(SAMPLE_LOGIN_POLICY);
                } else {
                  setPages(SAMPLE_LOGIN_PAGES.map((p, i) => ({ id: `sample-${i}`, name: p.name, text: p.text })));
                  setActivePageId("sample-0");
                  setPolicies(SAMPLE_LOGIN_POLICY);
                }
              }}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-300 transition"
            >
              로그인 기능
            </button>
            <button
              type="button"
              onClick={() => {
                setFunctionName("게시판");
                if (inputMode === "single") {
                  setDescription(SAMPLE_BOARD_SINGLE);
                  setPolicies(SAMPLE_BOARD_POLICY);
                } else {
                  setPages(SAMPLE_BOARD_PAGES.map((p, i) => ({ id: `sample-${i}`, name: p.name, text: p.text })));
                  setActivePageId("sample-0");
                  setPolicies(SAMPLE_BOARD_POLICY);
                }
              }}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-300 transition"
            >
              게시판 기능
            </button>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !mergedDescription.trim()}
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
          "TC 생성하기"
        )}
      </button>
    </form>
  );
}

// ===== 샘플 데이터 =====

const SAMPLE_LOGIN_SINGLE = `화면정의
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
• Enter 키 입력 시 [로그인] 버튼과 동일하게 동작`;

const SAMPLE_LOGIN_POLICY = `• 아이디: 영문+숫자 조합, 4~20자
• 비밀번호: 영문+숫자+특수문자 조합, 8~20자
• 비밀번호 5회 연속 오류 시 계정 잠금 (30분)
• 잠금 시 '계정이 잠겼습니다. 30분 후 다시 시도해주세요.' 문구 노출
• 아이디 저장 체크 시 다음 접속 시 아이디 자동 입력
• 자동 로그인 체크 시 세션 유지 (30일)
• 세션 만료 시 자동 로그아웃 후 로그인 페이지로 이동`;

const SAMPLE_LOGIN_PAGES = [
  {
    name: "화면 구성",
    text: `화면정의
• 아이디와 비밀번호를 입력하여 로그인하는 화면

화면 구성
• 아이디 입력 필드 (텍스트, 최대 20자)
• 비밀번호 입력 필드 (마스킹 처리, 최대 20자)
• [로그인] 버튼
• [아이디 찾기] / [비밀번호 찾기] 링크
• '아이디 저장' 체크박스
• '자동 로그인' 체크박스`,
  },
  {
    name: "로그인 동작",
    text: `로그인 동작
• 아이디와 비밀번호 입력 후 [로그인] 버튼 클릭 시 인증 처리
• 인증 성공 시 메인 페이지로 이동
• 인증 실패 시 '아이디 또는 비밀번호가 일치하지 않습니다.' 오류 문구 노출
• 아이디 미입력 시 '아이디를 입력해주세요.' 안내 문구 노출
• 비밀번호 미입력 시 '비밀번호를 입력해주세요.' 안내 문구 노출
• Enter 키 입력 시 [로그인] 버튼과 동일하게 동작`,
  },
];

const SAMPLE_BOARD_SINGLE = `화면정의
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
• 파일 첨부 (최대 5개, 각 10MB 이하)
• [등록] 버튼 클릭 시 저장 후 목록으로 이동
• [취소] 버튼 클릭 시 작성 내용 초기화 확인 팝업 후 목록으로 이동

게시글 수정/삭제
• 작성자 본인만 수정/삭제 가능
• 삭제 시 '정말 삭제하시겠습니까?' 확인 팝업 노출
• 관리자는 모든 게시글 삭제 가능`;

const SAMPLE_BOARD_POLICY = `• 비로그인 사용자: 목록 조회만 가능, 글쓰기 불가
• 제목: 필수, 1~100자
• 내용: 필수, 1~10,000자
• 첨부파일: jpg, png, pdf, docx만 허용
• XSS 방지: HTML 태그 입력 시 이스케이프 처리`;

const SAMPLE_BOARD_PAGES = [
  {
    name: "게시글 목록",
    text: `게시글 목록
• 게시글 번호, 제목, 작성자, 작성일, 조회수 컬럼 표시
• 한 페이지에 10개씩 표시 (페이지네이션)
• [글쓰기] 버튼 → 게시글 작성 페이지로 이동
• 제목 클릭 → 게시글 상세 페이지로 이동
• 검색: 제목/내용/작성자 검색 가능`,
  },
  {
    name: "게시글 작성",
    text: `게시글 작성
• 제목 입력 (필수, 최대 100자)
• 내용 입력 (필수, 에디터 제공)
• 파일 첨부 (최대 5개, 각 10MB 이하)
• [등록] 버튼 클릭 시 저장 후 목록으로 이동
• [취소] 버튼 클릭 시 작성 내용 초기화 확인 팝업 후 목록으로 이동`,
  },
  {
    name: "수정/삭제",
    text: `게시글 수정/삭제
• 작성자 본인만 수정/삭제 가능
• 삭제 시 '정말 삭제하시겠습니까?' 확인 팝업 노출
• 관리자는 모든 게시글 삭제 가능`,
  },
];

