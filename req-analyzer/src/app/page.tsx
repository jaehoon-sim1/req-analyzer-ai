'use client';

import { useState } from 'react';
import { useAnalysis } from '@/lib/useAnalysis';
import InputSection from '@/components/InputSection';
import ProgressBar from '@/components/ProgressBar';
import ResultSection from '@/components/ResultSection';
import ErrorMessage from '@/components/ErrorMessage';

export default function Home() {
  const [inputText, setInputText] = useState('');
  const { result, isLoading, progress, progressMessage, error, analyze, reset } = useAnalysis();

  const handleAnalyze = () => {
    if (inputText.trim()) {
      analyze(inputText.trim());
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
          data-testid="input-section"
        />

        {/* Step 2: Progress */}
        {isLoading && (
          <ProgressBar
            progress={progress}
            message={progressMessage}
            data-testid="progress-bar"
          />
        )}

        {/* Error */}
        {error && <ErrorMessage message={error} onDismiss={() => reset()} />}

        {/* Step 3: Results */}
        {result && !isLoading && (
          <ResultSection result={result} data-testid="result-summary" />
        )}
      </div>
    </main>
  );
}
