'use client';

import { useState, useEffect } from 'react';

interface FigmaImportProps {
  onTextExtracted: (text: string) => void;
}

const FIGMA_TOKEN_KEY = 'figma_api_token';

function extractFigmaFileKey(url: string): string | null {
  // Figma URL: https://www.figma.com/design/FILE_KEY/... or /file/FILE_KEY/...
  const match = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

function extractNodeId(url: string): string | null {
  const match = url.match(/node-id=([0-9-]+)/);
  return match ? match[1].replace('-', ':') : null;
}

export default function FigmaImport({ onTextExtracted }: FigmaImportProps) {
  const [token, setToken] = useState('');
  const [figmaUrl, setFigmaUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [tokenSaved, setTokenSaved] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(FIGMA_TOKEN_KEY);
    if (saved) {
      setToken(saved);
      setTokenSaved(true);
    }
  }, []);

  function handleSaveToken() {
    if (!token.trim()) {
      setError('Figma API 토큰을 입력해주세요.');
      return;
    }
    localStorage.setItem(FIGMA_TOKEN_KEY, token.trim());
    setTokenSaved(true);
    setError('');
    setInfo('토큰이 저장되었습니다.');
  }

  function handleClearToken() {
    localStorage.removeItem(FIGMA_TOKEN_KEY);
    setToken('');
    setTokenSaved(false);
    setInfo('');
  }

  async function handleImport() {
    setError('');
    setInfo('');

    if (!token.trim()) {
      setError('Figma API 토큰을 먼저 입력해주세요.');
      return;
    }

    const fileKey = extractFigmaFileKey(figmaUrl);
    if (!fileKey) {
      setError('올바른 Figma URL을 입력해주세요. (예: https://www.figma.com/design/FILE_KEY/...)');
      return;
    }

    const nodeId = extractNodeId(figmaUrl);

    setIsLoading(true);
    setInfo('Figma 파일에서 텍스트를 추출하고 있습니다...');

    try {
      const res = await fetch('/api/figma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), fileKey, nodeId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Figma API 요청 실패 (${res.status})`);
      }

      const data = await res.json();
      if (!data.text || data.text.trim().length === 0) {
        throw new Error('Figma 파일에서 텍스트를 찾을 수 없습니다.');
      }

      setInfo(`텍스트 추출 완료: ${data.text.length.toLocaleString()}자 (${data.nodeCount}개 노드)`);
      onTextExtracted(data.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Figma 연동 중 오류가 발생했습니다.');
      setInfo('');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4" data-testid="figma-import">
      {/* Token 입력 */}
      <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-indigo-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <label className="text-xs font-semibold text-gray-300">Figma API Token</label>
          {tokenSaved && (
            <span className="text-xs text-green-400 ml-auto">저장됨</span>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="password"
            data-testid="figma-token-input"
            className="flex-1 bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
            placeholder="Figma Personal Access Token 입력"
            value={token}
            onChange={(e) => { setToken(e.target.value); setTokenSaved(false); }}
          />
          <button
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-xs font-semibold transition whitespace-nowrap"
            onClick={handleSaveToken}
          >
            저장
          </button>
          {tokenSaved && (
            <button
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-xs font-semibold transition whitespace-nowrap"
              onClick={handleClearToken}
            >
              삭제
            </button>
          )}
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Figma &gt; Settings &gt; Personal Access Tokens에서 발급할 수 있습니다. 토큰은 브라우저에만 저장되며 서버에 보관되지 않습니다.
        </p>
      </div>

      {/* Figma URL 입력 */}
      <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
        <label className="text-xs font-semibold text-gray-300 block mb-2">Figma 파일 URL</label>
        <input
          type="url"
          data-testid="figma-url-input"
          className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
          placeholder="https://www.figma.com/design/XXXXX/파일이름?node-id=0-1"
          value={figmaUrl}
          onChange={(e) => setFigmaUrl(e.target.value)}
        />
        <p className="text-xs text-gray-600 mt-2">
          Figma에서 파일 또는 프레임 URL을 붙여넣으세요. 특정 프레임 URL을 사용하면 해당 프레임만 분석합니다.
        </p>
      </div>

      {/* Import 버튼 */}
      <button
        data-testid="figma-import-btn"
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
        onClick={handleImport}
        disabled={isLoading || !token.trim() || !figmaUrl.trim()}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            Figma에서 텍스트 추출 중...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" viewBox="0 0 38 57" fill="currentColor" aria-hidden="true">
              <path d="M19 28.5a9.5 9.5 0 1 1 0-19 9.5 9.5 0 0 1 0 19z" fillOpacity=".8"/>
              <path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z" fillOpacity=".4"/>
              <path d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z" fillOpacity=".6"/>
              <path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z" fillOpacity=".8"/>
              <path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z" fillOpacity=".6"/>
            </svg>
            Figma에서 텍스트 가져오기
          </>
        )}
      </button>

      {/* Status messages */}
      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-sm text-red-300" data-testid="figma-error">
          {error}
        </div>
      )}
      {info && !error && (
        <div className="bg-indigo-900/30 border border-indigo-800 rounded-lg p-3 text-sm text-indigo-300" data-testid="figma-info">
          {info}
        </div>
      )}
    </div>
  );
}
