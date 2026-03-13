'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';

type UploadState = 'idle' | 'dragging-over' | 'uploading' | 'success' | 'error';

interface FileUploadProps {
  onTextExtracted: (text: string) => void;
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/png',
  'image/jpeg',
];
const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.png', '.jpg', '.jpeg'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isValidFile(file: File): { valid: boolean; error?: string } {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  const typeOk = ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.includes(ext);
  if (!typeOk) {
    return { valid: false, error: '지원하지 않는 파일 형식입니다. PDF, DOCX, TXT, PNG, JPG 파일만 업로드할 수 있습니다.' };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { valid: false, error: `파일 크기가 너무 큽니다. 최대 10MB까지 업로드할 수 있습니다. (현재: ${formatFileSize(file.size)})` };
  }
  return { valid: true };
}

export default function FileUpload({ onTextExtracted }: FileUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (uploadState !== 'uploading') {
      setUploadState('dragging-over');
    }
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (uploadState === 'dragging-over') {
      setUploadState('idle');
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (uploadState === 'uploading') return;
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // reset input so the same file can be selected again
    e.target.value = '';
  }

  function processFile(file: File) {
    const validation = isValidFile(file);
    if (!validation.valid) {
      setUploadState('error');
      setSelectedFile(null);
      setErrorMessage(validation.error ?? '파일 업로드에 실패했습니다.');
      return;
    }
    setSelectedFile(file);
    setErrorMessage('');
    uploadFile(file);
  }

  async function uploadFile(file: File) {
    setUploadState('uploading');
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Simulate progress while waiting for the response
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 85) {
            clearInterval(progressInterval);
            return 85;
          }
          return prev + 10;
        });
      }, 150);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        let msg = '파일 업로드에 실패했습니다.';
        try {
          const data = await response.json();
          if (data?.error) msg = data.error;
        } catch {
          // ignore parse errors
        }
        throw new Error(msg);
      }

      const data = await response.json();
      setProgress(100);
      setUploadState('success');
      onTextExtracted(data.text ?? '');
    } catch (err) {
      setProgress(0);
      setUploadState('error');
      setErrorMessage(err instanceof Error ? err.message : '파일 업로드에 실패했습니다.');
    }
  }

  function handleReset() {
    setUploadState('idle');
    setSelectedFile(null);
    setProgress(0);
    setErrorMessage('');
  }

  // Border/background classes depending on state
  const zoneClasses = [
    'relative flex flex-col items-center justify-center gap-3',
    'w-full rounded-xl border-2 border-dashed p-10 text-center',
    'transition-all duration-200 cursor-pointer',
    uploadState === 'dragging-over'
      ? 'border-indigo-500 bg-indigo-500/10'
      : uploadState === 'error'
      ? 'border-red-600 bg-red-900/10'
      : uploadState === 'success'
      ? 'border-green-600 bg-green-900/10'
      : 'border-gray-700 bg-gray-800/50 hover:border-gray-500',
    uploadState === 'uploading' ? 'pointer-events-none' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col gap-3">
      {/* Drop zone */}
      <div
        data-testid="file-upload"
        className={zoneClasses}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => uploadState !== 'uploading' && inputRef.current?.click()}
        role="button"
        aria-label="파일 업로드 영역"
      >
        <input
          ref={inputRef}
          data-testid="file-upload-input"
          type="file"
          className="hidden"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          onChange={handleInputChange}
        />

        {/* Icon */}
        {uploadState === 'success' ? (
          <span className="text-4xl">✅</span>
        ) : uploadState === 'error' ? (
          <span className="text-4xl">❌</span>
        ) : uploadState === 'uploading' ? (
          <span className="text-4xl animate-pulse">⏳</span>
        ) : (
          <span className="text-4xl">📎</span>
        )}

        {/* Main instruction text */}
        {uploadState === 'idle' && (
          <>
            <p className="text-sm font-semibold text-gray-200">
              파일을 여기에 드래그하거나 클릭하여 업로드
            </p>
            <p className="text-xs text-gray-500">
              지원 형식: PDF, DOCX, TXT, PNG, JPG &nbsp;·&nbsp; 최대 크기: 10MB
            </p>
          </>
        )}

        {uploadState === 'dragging-over' && (
          <p className="text-sm font-semibold text-indigo-300">
            파일을 여기에 놓으세요!
          </p>
        )}

        {/* Uploading state */}
        {uploadState === 'uploading' && selectedFile && (
          <div className="w-full max-w-sm flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-gray-200 font-semibold truncate">{selectedFile.name}</p>
            <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mt-1">
              <div
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-full bg-indigo-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-indigo-400 text-right">{progress}%</p>
          </div>
        )}

        {/* Success state */}
        {uploadState === 'success' && selectedFile && (
          <div className="flex flex-col items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-green-400">업로드 완료</p>
            <p className="text-xs text-gray-400 truncate max-w-xs">{selectedFile.name}</p>
            <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
          </div>
        )}

        {/* Error state */}
        {uploadState === 'error' && (
          <div className="flex flex-col items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-red-400">업로드 실패</p>
            <p className="text-xs text-red-400/80 max-w-xs">{errorMessage}</p>
          </div>
        )}
      </div>

      {/* File info bar (after selection, before/after upload) */}
      {selectedFile && uploadState !== 'uploading' && (
        <div className="flex items-center justify-between px-3 py-2 bg-gray-800 rounded-lg text-xs text-gray-400">
          <span className="truncate max-w-[70%]">{selectedFile.name}</span>
          <div className="flex items-center gap-3 shrink-0">
            <span>{formatFileSize(selectedFile.size)}</span>
            <button
              className="text-gray-500 hover:text-gray-200 transition"
              onClick={handleReset}
              title="파일 제거"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Retry button on error with no file info bar */}
      {uploadState === 'error' && !selectedFile && (
        <button
          className="self-start text-xs text-indigo-400 hover:text-indigo-300 transition"
          onClick={handleReset}
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
