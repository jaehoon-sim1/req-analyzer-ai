'use client';

import { useState, useEffect, useRef } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import type { KnowledgeDocument } from '@/types';
import { v4 as uuidv4 } from 'uuid';

type UploadTab = 'file' | 'figma';

export function KnowledgeManager() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [activeTab, setActiveTab] = useState<UploadTab>('file');
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [title, setTitle] = useState('');
  const [figmaUrl, setFigmaUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadDocuments();
    checkAdmin();
  }, []);

  async function checkAdmin() {
    try {
      const supabase = createSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        setIsAdmin(data?.role === 'admin');
      }
    } catch { /* 비로그인 */ }
  }

  async function loadDocuments() {
    const response = await fetch('/api/knowledge');
    if (response.ok) {
      const data = await response.json();
      setDocuments(data.documents || []);
    }
  }

  // ── 파일 업로드 (Supabase Storage 직접 업로드 → API 처리) ──
  async function handleFileUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadMessage('');
    setUploadProgress(0);

    try {
      const supabase = createSupabaseClient();
      const storagePath = `uploads/${uuidv4()}_${file.name}`;

      // 1단계: Supabase Storage에 직접 업로드 (500MB까지)
      setUploadMessage(`파일 업로드 중... (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
      setUploadProgress(20);

      const { error: storageError } = await supabase.storage
        .from('knowledge-files')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (storageError) throw new Error(`Storage 오류: ${storageError.message}`);

      setUploadProgress(50);
      setUploadMessage('파일 분석 중...');

      // 2단계: API에 파싱 + 임베딩 요청
      const response = await fetch('/api/knowledge/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage_path: storagePath,
          filename: file.name,
          title: title || file.name,
        }),
      });

      setUploadProgress(90);
      const data = await response.json();

      if (response.ok) {
        setUploadMessage(`완료! ${data.saved_chunks}개 청크 저장됨`);
        setTitle('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        loadDocuments();
      } else {
        setUploadMessage(`오류: ${data.error}`);
      }
    } catch (err) {
      setUploadMessage(`오류: ${err instanceof Error ? err.message : '업로드 실패'}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  // ── Figma 연동 ──
  async function handleFigmaImport(e: React.FormEvent) {
    e.preventDefault();
    if (!figmaUrl.trim()) return;

    setUploading(true);
    setUploadMessage('Figma 파일 분석 중...');
    setUploadProgress(10);

    try {
      const response = await fetch('/api/knowledge/figma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          figma_url: figmaUrl.trim(),
          title: title || 'Figma 디자인',
        }),
      });

      setUploadProgress(90);
      const data = await response.json();

      if (response.ok) {
        setUploadMessage(`완료! ${data.saved_chunks}개 청크 저장됨`);
        setTitle('');
        setFigmaUrl('');
        loadDocuments();
      } else {
        setUploadMessage(`오류: ${data.error}`);
      }
    } catch (err) {
      setUploadMessage(`오류: ${err instanceof Error ? err.message : 'Figma 연동 실패'}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  async function handleDelete(documentId: string) {
    if (!confirm('이 지식 문서를 삭제하시겠습니까?')) return;
    await fetch(`/api/knowledge?id=${documentId}`, { method: 'DELETE' });
    loadDocuments();
  }

  const sourceTypeLabel: Record<string, string> = {
    file: '파일',
    conversation: '대화',
    manual: '수동 입력',
    figma: 'Figma',
  };

  const sourceTypeIcon: Record<string, string> = {
    file: '📄',
    conversation: '💬',
    manual: '✏️',
    figma: '🎨',
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950" data-testid="knowledge-manager">
      <header className="px-6 py-4 border-b border-gray-800">
        <h1 className="text-lg font-semibold text-white">지식 관리</h1>
        <p className="text-sm text-gray-400 mt-1">
          문서를 업로드하거나 Figma를 연동하여 닥터인포가 학습할 지식을 추가하세요
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* 탭 선택 */}
        <div className="flex gap-2 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab('file')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'file'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            📄 파일 업로드
          </button>
          <button
            onClick={() => setActiveTab('figma')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'figma'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            🎨 Figma 연동
          </button>
        </div>

        {/* 파일 업로드 탭 */}
        {activeTab === 'file' && (
          <form
            onSubmit={handleFileUpload}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4"
          >
            <h2 className="text-white font-medium">파일 업로드</h2>

            <input
              type="text"
              placeholder="문서 제목 (선택)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="knowledge-title-input"
            />

            {/* 드래그앤드롭 영역 */}
            <div
              className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (fileInputRef.current && e.dataTransfer.files[0]) {
                  const dt = new DataTransfer();
                  dt.items.add(e.dataTransfer.files[0]);
                  fileInputRef.current.files = dt.files;
                }
              }}
            >
              <div className="text-4xl mb-2">📁</div>
              <p className="text-gray-400 text-sm">
                클릭하거나 파일을 드래그하세요
              </p>
              <p className="text-gray-600 text-xs mt-1">
                PDF, DOCX, TXT, MD · 최대 500MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md"
                className="hidden"
                data-testid="knowledge-file-input"
              />
            </div>

            {/* 진행 바 */}
            {uploading && uploadProgress > 0 && (
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={uploading}
              className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              data-testid="knowledge-upload-btn"
            >
              {uploading ? uploadMessage || '업로드 중...' : '업로드 시작'}
            </button>

            {uploadMessage && !uploading && (
              <p
                className={`text-sm ${uploadMessage.startsWith('오류') ? 'text-red-400' : 'text-green-400'}`}
                data-testid="upload-message"
              >
                {uploadMessage}
              </p>
            )}
          </form>
        )}

        {/* Figma 연동 탭 */}
        {activeTab === 'figma' && (
          <form
            onSubmit={handleFigmaImport}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4"
          >
            <div>
              <h2 className="text-white font-medium">Figma 연동</h2>
              <p className="text-xs text-gray-500 mt-1">
                Figma 파일의 텍스트, 컴포넌트명, 디자인 설명을 학습합니다.
                설정 탭에서 Figma API 토큰을 먼저 입력해주세요.
              </p>
            </div>

            <input
              type="text"
              placeholder="지식 제목 (예: 로그인 화면 디자인 스펙)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div>
              <label className="block text-sm text-gray-400 mb-1">Figma 파일 URL</label>
              <input
                type="url"
                placeholder="https://www.figma.com/file/..."
                value={figmaUrl}
                onChange={(e) => setFigmaUrl(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                data-testid="figma-url-input"
              />
              <p className="text-xs text-gray-600 mt-1">
                Figma 파일을 열고 주소창의 URL을 붙여넣으세요
              </p>
            </div>

            {/* 학습 내용 안내 */}
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-2 text-xs text-gray-400">
              <p className="font-medium text-gray-300">학습되는 내용:</p>
              <ul className="space-y-1 pl-2">
                <li>📝 텍스트 레이어 (버튼명, 레이블, 설명)</li>
                <li>🧩 컴포넌트명 및 계층 구조</li>
                <li>📐 페이지 및 프레임 구조</li>
                <li>🖼 주요 화면 이미지 (Claude Vision 분석)</li>
              </ul>
            </div>

            {uploading && uploadProgress > 0 && (
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || !figmaUrl.trim()}
              className="w-full px-4 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
              data-testid="figma-import-btn"
            >
              {uploading ? uploadMessage || 'Figma 분석 중...' : 'Figma 학습 시작'}
            </button>

            {uploadMessage && !uploading && (
              <p className={`text-sm ${uploadMessage.startsWith('오류') ? 'text-red-400' : 'text-green-400'}`}>
                {uploadMessage}
              </p>
            )}
          </form>
        )}

        {/* 문서 목록 */}
        <div>
          <h2 className="text-white font-medium mb-3">
            학습된 지식 ({documents.length}건)
          </h2>

          {documents.length === 0 ? (
            <p className="text-gray-500 text-sm">아직 학습된 지식이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg p-4"
                  data-testid="knowledge-document"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">
                      {sourceTypeIcon[doc.source_type] || '📄'}
                    </span>
                    <div>
                      <p className="text-white text-sm font-medium">{doc.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="px-2 py-0.5 bg-gray-800 rounded">
                          {sourceTypeLabel[doc.source_type] || doc.source_type}
                        </span>
                        <span>{doc.chunk_count || 0}개 청크</span>
                        <span>{new Date(doc.created_at).toLocaleDateString('ko-KR')}</span>
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="text-red-400 hover:text-red-300 text-sm transition-colors ml-4 shrink-0"
                      data-testid="knowledge-delete-btn"
                    >
                      삭제
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
