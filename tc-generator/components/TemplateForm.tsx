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
    if (!description.trim()) return;
    onGenerate({ functionName: functionName || "기능", description, policies });
  };

  const descLength = description.length;
  const policyLength = policies.length;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
        기능명과 Figma 디스크립션을 붙여넣으면 AI가 TestCase를 생성합니다.
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          기능명 <span className="text-gray-400 font-normal">(선택)</span>
        </label>
        <input
          type="text"
          value={functionName}
          onChange={(e) => setFunctionName(e.target.value)}
          placeholder="예: 로그인"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-semibold text-gray-700">
            기능 상세 설명 / 디스크립션 <span className="text-red-500">*</span>
          </label>
          <span className="text-xs text-gray-400">{descLength.toLocaleString()}자</span>
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={"Figma 디스크립션을 복사하여 붙여넣으세요.\n\n예:\n화면정의\n• 아이디와 비밀번호를 입력하여 로그인하는 화면\n\n화면 구성\n• 아이디 입력 필드 (텍스트)\n• 비밀번호 입력 필드 (마스킹 처리)\n• [로그인] 버튼\n• [아이디 찾기] / [비밀번호 찾기] 링크\n• '아이디 저장' 체크박스\n\n로그인 정책\n• 아이디: 영문+숫자 조합, 4~20자\n• 비밀번호: 영문+숫자+특수문자, 8~20자\n• 로그인 실패 시 '아이디 또는 비밀번호가 일치하지 않습니다' 문구 노출\n• 비밀번호 5회 연속 오류 시 계정 잠금 (30분)\n• 잠금 시 '계정이 잠겼습니다. 30분 후 다시 시도해주세요.' 문구 노출"}
          rows={12}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y text-gray-900 leading-relaxed"
          required
        />
        <p className="mt-1 text-xs text-gray-400">
          Figma 기획서의 Description, 화면정의, 정책 등을 그대로 복사해서 붙여넣으세요.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-semibold text-gray-700">
            주요 정책 <span className="text-gray-400 font-normal">(선택)</span>
          </label>
          {policyLength > 0 && (
            <span className="text-xs text-gray-400">{policyLength.toLocaleString()}자</span>
          )}
        </div>
        <textarea
          value={policies}
          onChange={(e) => setPolicies(e.target.value)}
          placeholder={"추가 정책이나 예외 케이스가 있으면 입력하세요.\n\n예:\n• 비밀번호 5회 오류 시 계정 잠금 (30분)\n• 잠금 해제 후에도 기존 오류 횟수 초기화\n• 아이디 저장 체크 시 다음 접속 시 아이디 자동 입력\n• 세션 만료 시 자동 로그아웃 후 로그인 페이지로 이동"}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y text-gray-900 leading-relaxed"
        />
      </div>

      {/* 입력 요약 */}
      {(descLength > 0 || policyLength > 0) && (
        <div className="bg-gray-50 border rounded-lg px-3 py-2 flex items-center justify-between text-xs text-gray-500">
          <span>
            총 {(descLength + policyLength).toLocaleString()}자 · ~{Math.ceil((descLength + policyLength) / 2).toLocaleString()} 토큰
          </span>
          {descLength + policyLength > 10000 && (
            <span className="text-amber-600">⚠ 텍스트가 많아 토큰 사용량이 높을 수 있습니다</span>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !description.trim()}
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
