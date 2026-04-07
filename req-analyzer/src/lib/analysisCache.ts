import type { AnalysisResult } from '@/types/analysis';

const CACHE_KEY = 'analysis_cache';
const MAX_CACHE_ENTRIES = 20;

interface CacheEntry {
  inputHash: string;
  inputPreview: string; // 앞 100자 미리보기 (UI 표시용)
  result: AnalysisResult;
  cachedAt: string;
  source?: string; // 'text' | 'file' | 'figma'
}

interface CacheStore {
  entries: CacheEntry[];
}

/** 입력 텍스트의 해시 생성 (간단한 djb2 해시) */
function hashText(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

function loadStore(): CacheStore {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return { entries: [] };
    return JSON.parse(raw) as CacheStore;
  } catch {
    return { entries: [] };
  }
}

function saveStore(store: CacheStore): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(store));
  } catch {
    // localStorage 용량 초과 시 오래된 항목 삭제 후 재시도
    store.entries = store.entries.slice(-5);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(store));
    } catch {
      // 그래도 실패하면 포기
    }
  }
}

/** 캐시에서 분석 결과 조회 */
export function getCachedResult(inputText: string): CacheEntry | null {
  const hash = hashText(inputText.trim());
  const store = loadStore();
  return store.entries.find((e) => e.inputHash === hash) ?? null;
}

/** 분석 결과를 캐시에 저장 */
export function cacheResult(inputText: string, result: AnalysisResult, source?: string): void {
  const hash = hashText(inputText.trim());
  const store = loadStore();

  // 이미 동일 해시가 있으면 업데이트
  const existingIdx = store.entries.findIndex((e) => e.inputHash === hash);
  const entry: CacheEntry = {
    inputHash: hash,
    inputPreview: inputText.trim().slice(0, 100),
    result,
    cachedAt: new Date().toISOString(),
    source,
  };

  if (existingIdx >= 0) {
    store.entries[existingIdx] = entry;
  } else {
    store.entries.push(entry);
    // 최대 개수 초과 시 오래된 항목 제거
    if (store.entries.length > MAX_CACHE_ENTRIES) {
      store.entries = store.entries.slice(-MAX_CACHE_ENTRIES);
    }
  }

  saveStore(store);
}

/** 캐시된 분석 이력 목록 반환 */
export function getCacheHistory(): CacheEntry[] {
  const store = loadStore();
  return [...store.entries].reverse(); // 최신순
}

/** 특정 캐시 삭제 */
export function removeCacheEntry(inputHash: string): void {
  const store = loadStore();
  store.entries = store.entries.filter((e) => e.inputHash !== inputHash);
  saveStore(store);
}

/** 전체 캐시 삭제 */
export function clearCache(): void {
  localStorage.removeItem(CACHE_KEY);
}
