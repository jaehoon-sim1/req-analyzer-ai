'use client';

import { useState, useCallback } from 'react';
import type { AnalysisResult, StreamEvent } from '@/types/analysis';

interface UseAnalysisReturn {
  result: AnalysisResult | null;
  isLoading: boolean;
  progress: number;
  progressMessage: string;
  currentSection: string | null;
  error: string | null;
  analyze: (text: string) => Promise<void>;
  reset: () => void;
}

export function useAnalysis(): UseAnalysisReturn {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [currentSection, setCurrentSection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setResult(null);
    setIsLoading(false);
    setProgress(0);
    setProgressMessage('');
    setCurrentSection(null);
    setError(null);
  }, []);

  const analyze = useCallback(async (text: string) => {
    reset();
    setIsLoading(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || '분석 요청에 실패했습니다.');
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
              case 'result':
                setResult(event.data as AnalysisResult);
                break;
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
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
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
    analyze,
    reset,
  };
}
