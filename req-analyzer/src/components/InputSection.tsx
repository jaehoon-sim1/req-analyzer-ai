'use client';

import { useState, useCallback } from 'react';
import { SAMPLES } from '@/data/samples';
import FileUpload from '@/components/FileUpload';
import FigmaImport from '@/components/FigmaImport';

const MIN_CHARS = 10;
const MAX_CHARS_SINGLE = 50000;
const MAX_CHARS_MULTI = 100000;

type InputMode = 'text' | 'multipage' | 'file' | 'figma';

interface PageEntry {
  id: string;
  name: string;
  text: string;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

interface InputSectionProps {
  value: string;
  onChange: (value: string) => void;
  onAnalyze: () => void;
  onReset: () => void;
  isLoading: boolean;
  testId?: string;
}

export default function InputSection({
  value,
  onChange,
  onAnalyze,
  onReset,
  isLoading,
  testId,
}: InputSectionProps) {
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [pages, setPages] = useState<PageEntry[]>([
    { id: generateId(), name: '페이지 1', text: '' },
  ]);
  const [activePageId, setActivePageId] = useState<string>(pages[0].id);
  // editingPageId removed — title input is always visible for active page

  const charCount = value.length;
  const maxChars = inputMode === 'figma' ? MAX_CHARS_MULTI : inputMode === 'multipage' ? MAX_CHARS_MULTI : MAX_CHARS_SINGLE;
  const isBelowMin = value.trim().length < MIN_CHARS;

  // Merge all pages into a single value string
  const syncPagesToValue = useCallback((updatedPages: PageEntry[]) => {
    const merged = updatedPages
      .filter((p) => p.text.trim().length > 0)
      .map((p) => `[${p.name}]\n${p.text}`)
      .join('\n\n');
    onChange(merged);
  }, [onChange]);

  function handleTextExtracted(text: string) {
    onChange(text);
    if (inputMode !== 'figma') {
      setInputMode('text');
    }
  }

  function handleFigmaAutoAnalyze() {
    if (value.trim().length >= MIN_CHARS) {
      onAnalyze();
    }
  }

  function handleModeChange(mode: InputMode) {
    setInputMode(mode);
    if (mode === 'multipage') {
      // Initialize pages if switching to multipage and pages are empty
      if (pages.length === 1 && pages[0].text === '' && value.trim().length > 0) {
        // If there's existing text, put it in the first page
        const updatedPages = [{ ...pages[0], text: value }];
        setPages(updatedPages);
      }
      syncPagesToValue(pages);
    }
  }

  function handleReset() {
    setInputMode('text');
    setPages([{ id: generateId(), name: '페이지 1', text: '' }]);
    onReset();
  }

  // Multi-page handlers
  function addPage() {
    const newPage: PageEntry = {
      id: generateId(),
      name: `페이지 ${pages.length + 1}`,
      text: '',
    };
    const updated = [...pages, newPage];
    setPages(updated);
    setActivePageId(newPage.id);
  }

  function removePage(id: string) {
    if (pages.length <= 1) return;
    const updated = pages.filter((p) => p.id !== id);
    setPages(updated);
    if (activePageId === id) {
      setActivePageId(updated[0].id);
    }
    syncPagesToValue(updated);
  }

  function updatePageText(id: string, text: string) {
    const updated = pages.map((p) => (p.id === id ? { ...p, text } : p));
    setPages(updated);
    syncPagesToValue(updated);
  }

  function updatePageName(id: string, name: string) {
    const updated = pages.map((p) => (p.id === id ? { ...p, name } : p));
    setPages(updated);
    syncPagesToValue(updated);
  }

  const activePage = pages.find((p) => p.id === activePageId) || pages[0];
  const totalChars = pages.reduce((sum, p) => sum + p.text.length, 0);
  const filledPages = pages.filter((p) => p.text.trim().length > 0).length;

  return (
    <section className="bg-gray-900 rounded-xl p-6 mb-6" data-testid={testId}>
      {/* Header row: label + char counter */}
      <div className="flex justify-between items-center mb-3">
        <label htmlFor="req-input" className="font-semibold text-sm">요구사항 입력</label>
        {(inputMode === 'text' || inputMode === 'multipage') && (
          <span className="text-xs text-gray-400">
            {inputMode === 'multipage' ? totalChars.toLocaleString() : charCount.toLocaleString()} / {maxChars.toLocaleString()}자
          </span>
        )}
      </div>

      {/* Mode toggle */}
      <div role="tablist" aria-label="입력 방식 선택" className="flex gap-1 mb-4 p-1 bg-gray-800 rounded-lg w-fit">
        <button
          role="tab"
          aria-selected={inputMode === 'text'}
          data-testid="input-mode-text"
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
            inputMode === 'text'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-gray-400 hover:text-gray-200'
          }`}
          onClick={() => handleModeChange('text')}
        >
          텍스트 입력
        </button>
        <button
          role="tab"
          aria-selected={inputMode === 'multipage'}
          data-testid="input-mode-multipage"
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
            inputMode === 'multipage'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-gray-400 hover:text-gray-200'
          }`}
          onClick={() => handleModeChange('multipage')}
        >
          다중 페이지
        </button>
        <button
          role="tab"
          aria-selected={inputMode === 'file'}
          data-testid="input-mode-file"
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
            inputMode === 'file'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-gray-400 hover:text-gray-200'
          }`}
          onClick={() => handleModeChange('file')}
        >
          파일 업로드
        </button>
        <button
          role="tab"
          aria-selected={inputMode === 'figma'}
          data-testid="input-mode-figma"
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
            inputMode === 'figma'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-gray-400 hover:text-gray-200'
          }`}
          onClick={() => handleModeChange('figma')}
        >
          Figma 연동
        </button>
      </div>

      {/* Input area */}
      {inputMode === 'text' ? (
        <>
          <textarea
            id="req-input"
            data-testid="req-input"
            aria-label="요구사항 텍스트 입력"
            aria-describedby="req-input-hint"
            className="w-full h-56 bg-gray-950 border border-gray-800 rounded-lg p-4 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-y"
            placeholder="요구사항을 한 줄에 하나씩 입력하세요.&#10;&#10;예시:&#10;1. 사용자는 이메일과 비밀번호로 로그인할 수 있어야 한다.&#10;2. 시스템은 빠르게 응답해야 한다."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            maxLength={maxChars}
          />
          <span id="req-input-hint" className="sr-only">최소 10자 이상 입력해야 분석을 시작할 수 있습니다</span>
        </>
      ) : inputMode === 'multipage' ? (
        <div data-testid="multipage-input">
          {/* Page summary bar */}
          <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
            <span>{pages.length}개 페이지</span>
            <span>{filledPages}개 입력됨</span>
            <span>{totalChars.toLocaleString()}자</span>
          </div>

          {/* Page tabs */}
          <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
            {pages.map((page, idx) => (
              <div
                key={page.id}
                className={`group flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 rounded-lg text-xs cursor-pointer transition shrink-0 ${
                  activePageId === page.id
                    ? 'bg-indigo-600 text-white'
                    : page.text.trim().length > 0
                    ? 'bg-gray-800 text-gray-300 border border-gray-700'
                    : 'bg-gray-800/50 text-gray-500 border border-gray-800'
                }`}
                onClick={() => setActivePageId(page.id)}
              >
                <span className={`text-[10px] font-mono shrink-0 ${
                  activePageId === page.id ? 'text-indigo-200' : 'text-gray-600'
                }`}>{idx + 1}</span>
                {page.text.trim().length > 0 && (
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    activePageId === page.id ? 'bg-white' : 'bg-green-400'
                  }`} />
                )}
                <span>{page.name}</span>
                {pages.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removePage(page.id); }}
                    className={`ml-0.5 opacity-0 group-hover:opacity-100 transition text-xs leading-none ${
                      activePageId === page.id ? 'text-indigo-200 hover:text-white' : 'text-gray-600 hover:text-red-400'
                    }`}
                    aria-label={`${page.name} 삭제`}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addPage}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-gray-800/30 text-gray-500 hover:bg-gray-800 hover:text-indigo-400 border border-dashed border-gray-700 transition shrink-0"
              aria-label="페이지 추가"
            >
              + 추가
            </button>
          </div>

          {/* Active page title editor + textarea */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-500 shrink-0">제목:</span>
            <input
              type="text"
              value={activePage.name}
              onChange={(e) => updatePageName(activePage.id, e.target.value)}
              placeholder="페이지 제목 입력 (예: 로그인, 결제, 마이페이지)"
              className="flex-1 bg-gray-950 border border-gray-800 rounded-md px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
          <textarea
            id="req-input"
            data-testid="req-input"
            aria-label={`${activePage.name} 텍스트 입력`}
            className="w-full h-48 bg-gray-950 border border-gray-800 rounded-lg p-4 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-y"
            placeholder={`${activePage.name}의 요구사항을 입력하세요.\n\nFigma에서 복사한 텍스트를 붙여넣거나, 해당 페이지의 요구사항을 작성하세요.`}
            value={activePage.text}
            onChange={(e) => updatePageText(activePage.id, e.target.value)}
          />

          {/* Page char info */}
          <div className="flex justify-between mt-1 text-xs text-gray-600">
            <span>이 페이지: {activePage.text.length.toLocaleString()}자</span>
            <span>페이지 순서가 섞여도 AI가 자동으로 정리합니다</span>
          </div>
        </div>
      ) : inputMode === 'file' ? (
        <FileUpload onTextExtracted={handleTextExtracted} />
      ) : (
        <FigmaImport onTextExtracted={handleTextExtracted} onAutoAnalyze={handleFigmaAutoAnalyze} />
      )}

      {/* Sample buttons — only shown in text mode */}
      {inputMode === 'text' && (
        <div className="flex gap-2 mt-3 flex-wrap">
          <span className="text-xs text-gray-500 leading-7">예제:</span>
          {Object.entries(SAMPLES).map(([key, text]) => (
            <button
              key={key}
              className="px-3 py-1 text-xs bg-gray-950 border border-gray-800 rounded-md text-gray-400 hover:border-indigo-500 hover:text-indigo-400 transition"
              onClick={() => onChange(text)}
            >
              {key === 'login' ? '로그인 시스템' : '전자상거래'}
            </button>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 mt-4">
        <button
          data-testid="analyze-btn"
          aria-label={isLoading ? '분석 진행 중' : '요구사항 분석 시작'}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition"
          onClick={onAnalyze}
          disabled={isLoading || isBelowMin}
        >
          {isLoading ? '분석 중...' : '분석 시작'}
        </button>
        <button
          aria-label="입력 내용 초기화"
          className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-semibold transition"
          onClick={handleReset}
        >
          초기화
        </button>
      </div>
    </section>
  );
}
