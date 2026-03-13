'use client';

import { useState } from 'react';
import { SAMPLES } from '@/data/samples';

const MIN_CHARS = 10;

interface InputSectionProps {
  value: string;
  onChange: (value: string) => void;
  onAnalyze: () => void;
  onReset: () => void;
  isLoading: boolean;
  'data-testid'?: string;
}

export default function InputSection({
  value,
  onChange,
  onAnalyze,
  onReset,
  isLoading,
  ...props
}: InputSectionProps) {
  const charCount = value.length;
  const maxChars = 50000;
  const isBelowMin = value.trim().length < MIN_CHARS;

  return (
    <section className="bg-gray-900 rounded-xl p-6 mb-6" data-testid={props['data-testid']}>
      <div className="flex justify-between items-center mb-3">
        <label htmlFor="req-input" className="font-semibold text-sm">요구사항 입력</label>
        <span className="text-xs text-gray-400">
          {charCount.toLocaleString()} / {maxChars.toLocaleString()}자
        </span>
      </div>

      <textarea
        id="req-input"
        data-testid="req-input"
        className="w-full h-56 bg-gray-950 border border-gray-800 rounded-lg p-4 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-y"
        placeholder="요구사항을 한 줄에 하나씩 입력하세요.&#10;&#10;예시:&#10;1. 사용자는 이메일과 비밀번호로 로그인할 수 있어야 한다.&#10;2. 시스템은 빠르게 응답해야 한다."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxChars}
      />

      {/* Sample buttons */}
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

      {/* Action buttons */}
      <div className="flex gap-3 mt-4">
        <button
          data-testid="analyze-btn"
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition"
          onClick={onAnalyze}
          disabled={isLoading || isBelowMin}
        >
          {isLoading ? '분석 중...' : '분석 시작'}
        </button>
        <button
          className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-semibold transition"
          onClick={onReset}
        >
          초기화
        </button>
      </div>
    </section>
  );
}
