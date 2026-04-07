'use client';

import { useState } from 'react';
import { useAnalysis } from '@/lib/useAnalysis';
import { removeCacheEntry, getCachedResult } from '@/lib/analysisCache';
import InputSection from '@/components/InputSection';
import ProgressBar from '@/components/ProgressBar';
import ResultSection from '@/components/ResultSection';
import ErrorMessage from '@/components/ErrorMessage';

export default function Home() {
  const [inputText, setInputText] = useState('');
  const { result, isLoading, progress, progressMessage, error, fromCache, analyze, reset } = useAnalysis();

  const handleAnalyze = () => {
    if (inputText.trim()) {
      analyze(inputText.trim());
    }
  };

  const handleReanalyze = () => {
    if (inputText.trim()) {
      // 캐시 삭제 후 재분석
      const cached = getCachedResult(inputText.trim());
      if (cached) {
        removeCacheEntry(cached.inputHash);
      }
      reset();
      setTimeout(() => analyze(inputText.trim()), 100);
    }
  };

  const handleReset = () => {
    setInputText('');
    reset();
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-10">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            요구사항 분석 AI
          </h1>
          <p className="text-gray-400 mt-2">
            소프트웨어 요구사항의 품질을 AI로 분석하고 개선점을 제안합니다
          </p>
        </header>

        {/* Step 1: Input */}
        <InputSection
          value={inputText}
          onChange={setInputText}
          onAnalyze={handleAnalyze}
          onReset={handleReset}
          isLoading={isLoading}
          testId="input-section"
        />

        {/* Step 2: Progress */}
        {isLoading && (
          <ProgressBar
            progress={progress}
            message={progressMessage}
            testId="progress-bar"
          />
        )}

        {/* Error */}
        {error && <ErrorMessage message={error} onDismiss={() => reset()} />}

        {/* Cache indicator + Re-analyze button */}
        {fromCache && result && !isLoading && (
          <div className="bg-indigo-900/20 border border-indigo-800/50 rounded-xl p-4 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span className="text-sm text-indigo-300">
                이전 분석 결과를 캐시에서 불러왔습니다 (토큰 절약)
              </span>
              {result.metadata?.analyzedAt && (
                <span className="text-xs text-gray-500 ml-2">
                  {new Date(result.metadata.analyzedAt).toLocaleString('ko-KR')}
                </span>
              )}
            </div>
            <button
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-md text-xs font-semibold transition whitespace-nowrap"
              onClick={handleReanalyze}
            >
              새로 분석
            </button>
          </div>
        )}

        {/* Step 3: Results */}
        {result && !isLoading && (
          <ResultSection result={result} testId="result-summary" />
        )}
      </div>
    </main>
  );
}
