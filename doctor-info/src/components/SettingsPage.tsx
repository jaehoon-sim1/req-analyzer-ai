'use client';

import { useState } from 'react';

interface ApiKeyConfig {
  voyageApiKey: string;
  figmaApiToken: string;
  teamsAppId: string;
  teamsAppPassword: string;
}

const STORAGE_KEY = 'doctor-info-settings';

function loadSettings(): ApiKeyConfig {
  if (typeof window === 'undefined') {
    return { voyageApiKey: '', figmaApiToken: '', teamsAppId: '', teamsAppPassword: '' };
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // 파싱 실패 시 기본값
  }
  return { voyageApiKey: '', figmaApiToken: '', teamsAppId: '', teamsAppPassword: '' };
}

function saveSettings(config: ApiKeyConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function SettingsPage() {
  const [config, setConfig] = useState<ApiKeyConfig>(loadSettings);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleChange(key: keyof ApiKeyConfig, value: string) {
    setConfig(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);

    // localStorage에 저장
    saveSettings(config);

    // API 키를 서버에도 전달 (환경변수 업데이트용)
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voyageApiKey: config.voyageApiKey || undefined,
          figmaApiToken: config.figmaApiToken || undefined,
          teamsAppId: config.teamsAppId || undefined,
          teamsAppPassword: config.teamsAppPassword || undefined,
        }),
      });
    } catch {
      // 서버 저장 실패해도 로컬에는 저장됨
    }

    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950" data-testid="settings-page">
      <header className="px-6 py-4 border-b border-gray-800">
        <h1 className="text-lg font-semibold text-white">설정</h1>
        <p className="text-sm text-gray-400 mt-1">
          API 키를 설정하여 고급 기능을 활성화하세요
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl">
        {/* 기본 기능 안내 */}
        <div className="bg-blue-600/10 border border-blue-600/30 rounded-xl p-4">
          <p className="text-sm text-blue-300">
            기본 AI 채팅은 별도 설정 없이 바로 사용 가능합니다.
            아래 API 키는 <strong>지식 학습(RAG)</strong>이나 <strong>Teams 봇</strong> 등
            추가 기능을 위한 설정입니다.
          </p>
        </div>

        {/* Voyage AI */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-white font-medium">Voyage AI (문서 학습용)</h2>
            <p className="text-xs text-gray-500 mt-1">
              문서를 업로드하여 닥터인포가 학습하려면 Voyage AI 임베딩 키가 필요합니다.
              무료 가입: dash.voyageai.com
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Voyage API Key</label>
            <input
              type="password"
              placeholder="pa-..."
              value={config.voyageApiKey}
              onChange={(e) => handleChange('voyageApiKey', e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              data-testid="voyage-key-input"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${config.voyageApiKey ? 'bg-green-500' : 'bg-gray-600'}`} />
            <span className={config.voyageApiKey ? 'text-green-400' : 'text-gray-500'}>
              {config.voyageApiKey ? '설정됨' : '미설정 — 기본 채팅만 가능'}
            </span>
          </div>
        </section>

        {/* Figma */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-white font-medium">Figma 연동 (디자인 학습용)</h2>
            <p className="text-xs text-gray-500 mt-1">
              Figma 파일을 지식으로 학습시키려면 Figma Personal Access Token이 필요합니다.
              발급: Figma → 계정 설정 → Personal access tokens
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Figma API Token</label>
            <input
              type="password"
              placeholder="figd_..."
              value={config.figmaApiToken}
              onChange={(e) => handleChange('figmaApiToken', e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              data-testid="figma-token-input"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${config.figmaApiToken ? 'bg-green-500' : 'bg-gray-600'}`} />
            <span className={config.figmaApiToken ? 'text-green-400' : 'text-gray-500'}>
              {config.figmaApiToken ? '설정됨' : '미설정 — Figma 학습 비활성'}
            </span>
          </div>
        </section>

        {/* Teams Bot */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-white font-medium">Microsoft Teams 봇</h2>
            <p className="text-xs text-gray-500 mt-1">
              Teams에서 닥터인포를 사용하려면 Azure Bot Service 등록이 필요합니다.
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Bot App ID</label>
            <input
              type="text"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={config.teamsAppId}
              onChange={(e) => handleChange('teamsAppId', e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              data-testid="teams-id-input"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Bot App Password</label>
            <input
              type="password"
              placeholder="비밀번호"
              value={config.teamsAppPassword}
              onChange={(e) => handleChange('teamsAppPassword', e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              data-testid="teams-pw-input"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${config.teamsAppId && config.teamsAppPassword ? 'bg-green-500' : 'bg-gray-600'}`} />
            <span className={config.teamsAppId && config.teamsAppPassword ? 'text-green-400' : 'text-gray-500'}>
              {config.teamsAppId && config.teamsAppPassword ? '설정됨' : '미설정 — Teams 봇 비활성'}
            </span>
          </div>
        </section>

        {/* 저장 버튼 */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            data-testid="save-settings-btn"
          >
            {saving ? '저장 중...' : '설정 저장'}
          </button>
          {saved && (
            <span className="text-sm text-green-400" data-testid="save-success">
              저장되었습니다
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
