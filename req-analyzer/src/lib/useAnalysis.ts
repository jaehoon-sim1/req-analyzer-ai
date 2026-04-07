import { useState, useCallback } from 'react';
import type { AnalysisResult, StreamEvent } from '@/types/analysis';
import { getCachedResult, cacheResult } from './analysisCache';

interface UseAnalysisReturn {
  result: AnalysisResult | null;
  isLoading: boolean;
  progress: number;
  progressMessage: string;
  currentSection: string | null;
  error: string | null;
  fromCache: boolean;
  analyze: (text: string, source?: string) => Promise<void>;
  reset: () => void;
}

export function useAnalysis(): UseAnalysisReturn {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [currentSection, setCurrentSection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const reset = useCallback(() => {
    setResult(null);
    setIsLoading(false);
    setProgress(0);
    setProgressMessage('');
    setCurrentSection(null);
    setError(null);
    setFromCache(false);
  }, []);

  const analyze = useCallback(async (text: string, source?: string) => {
    reset();

    // 캐시 확인
    const cached = getCachedResult(text);
    if (cached) {
      setFromCache(true);
      setProgress(100);
      setProgressMessage('이전 분석 결과를 불러왔습니다 (캐시)');
      setResult(cached.result);
      return;
    }

    setIsLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 180_000);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorMsg = `HTTP ${response.status}`;
        try {
          const errData = await response.json();
          errorMsg = errData.error || errorMsg;
        } catch { /* non-JSON response */ }
        throw new Error(errorMsg);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('스트리밍을 시작할 수 없습니다.');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6);

          try {
            const event = JSON.parse(jsonStr) as { type: string; section?: string; data?: unknown; progress?: number; message?: string };

            switch (event.type) {
              case 'analysis_start':
              case 'section_start':
              case 'section_complete':
                setProgress(event.progress || 0);
                setProgressMessage(event.message || '');
                if (event.section) setCurrentSection(event.section);
                break;
              case 'analysis_complete':
                setProgress(100);
                setProgressMessage(event.message || '분석 완료!');
                break;
              case 'result': {
                const analysisResult = event.data as AnalysisResult;
                setResult(analysisResult);
                // 결과를 캐시에 저장
                cacheResult(text, analysisResult, source);
                break;
              }
              case 'error':
                setError(event.message || '분석 중 오류가 발생했습니다.');
                break;
            }
          } catch {
            // skip malformed events
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('분석 시간이 초과되었습니다 (180초). 다시 시도해 주세요.');
      } else {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }, [reset]);

  return {
    result,
    isLoading,
    progress,
    progressMessage,
    currentSection,
    error,
    fromCache,
    analyze,
    reset,
  };
}
