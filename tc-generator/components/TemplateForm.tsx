"use client";

import { useState } from "react";

interface Props {
  onGenerate: (data: {
    functionName: string;
    description: string;
    policies: string;
  }) => void;
  isLoading: boolean;
}

export default function TemplateForm({ onGenerate, isLoading }: Props) {
  const [functionName, setFunctionName] = useState("");
  const [description, setDescription] = useState("");
  const [policies, setPolicies] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!functionName.trim() || !description.trim()) return;
    onGenerate({ functionName, description, policies });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        아래 템플릿에 맞춰 내용을 입력하면, AI가 자동으로 TestCase를
        생성합니다.
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          기능명 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={functionName}
          onChange={(e) => setFunctionName(e.target.value)}
          placeholder="예: 로그인 기능"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          기능 상세 설명 <span className="text-red-500">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="예: 아이디, 비밀번호를 텍스트에 입력하여 로그인을 하는 기능"
          rows={3}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none text-gray-900"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          주요 정책
        </label>
        <textarea
          value={policies}
          onChange={(e) => setPolicies(e.target.value)}
          placeholder="예: 비밀번호 5회 오류 시 잠금 처리, 아이디 미입력 시 안내문구 노출"
          rows={3}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none text-gray-900"
        />
      </div>

      {/* Preview */}
      {(functionName || description || policies) && (
        <div className="bg-gray-900 rounded-lg p-4 text-sm font-mono">
          <p className="text-gray-400 mb-2 text-xs">입력 미리보기</p>
          <p className="text-green-400">
            기능명: [{functionName || "..."}]
          </p>
          <p className="text-green-400">
            기능 상세 설명: [{description || "..."}]
          </p>
          <p className="text-green-400">
            주요 정책: [{policies || "..."}]
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !functionName.trim() || !description.trim()}
        className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-5 w-5"
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
            TC 생성 중...
          </>
        ) : (
          "TC 생성하기"
        )}
      </button>
    </form>
  );
}
