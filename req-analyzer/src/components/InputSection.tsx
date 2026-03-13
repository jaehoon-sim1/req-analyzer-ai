'use client';

import { useState } from 'react';

const SAMPLES: Record<string, string> = {
  login: `1. 사용자는 이메일과 비밀번호를 입력하여 로그인할 수 있어야 한다.
2. 비밀번호는 8자 이상, 영문/숫자/특수문자를 포함해야 한다.
3. 로그인 실패 시 "이메일 또는 비밀번호가 올바르지 않습니다" 메시지를 표시한다.
4. 5회 연속 로그인 실패 시 계정을 30분간 잠금한다.
5. 시스템은 빠르게 응답해야 한다.
6. 비밀번호 찾기 기능을 제공해야 한다.
7. 보안이 철저해야 한다.`,
  ecommerce: `1. 사용자는 상품명 또는 카테고리로 상품을 검색할 수 있어야 한다.
2. 검색 결과는 0.5초 이내에 표시되어야 한다.
3. 장바구니에 상품을 추가, 수정, 삭제할 수 있다.
4. 결제는 신용카드, 간편결제(카카오페이, 네이버페이)를 지원한다.
5. 결제 완료 시 주문 확인 이메일이 발송된다.
6. 시스템이 안정적이어야 한다.
7. UI가 사용하기 편해야 한다.
8. 주문 취소는 배송 전까지 가능하다.`,
};

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

  return (
    <section className="bg-gray-900 rounded-xl p-6 mb-6" data-testid={props['data-testid']}>
      <div className="flex justify-between items-center mb-3">
        <label className="font-semibold text-sm">요구사항 입력</label>
        <span className="text-xs text-gray-400">
          {charCount.toLocaleString()} / {maxChars.toLocaleString()}자
        </span>
      </div>

      <textarea
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
          disabled={isLoading || !value.trim()}
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
