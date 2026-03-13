'use client';

import { useState } from 'react';
import type { AnalysisResult } from '@/types/analysis';

interface ResultSectionProps {
  result: AnalysisResult;
  'data-testid'?: string;
}

const TABS = [
  { key: 'summary', label: '요약', testId: 'section-summary' },
  { key: 'features', label: '기능 목록', testId: 'section-features' },
  { key: 'testPoints', label: '테스트 포인트', testId: 'section-test-points' },
  { key: 'ambiguity', label: '모호한 요구사항', testId: 'section-ambiguity' },
  { key: 'missingRequirements', label: '누락 요구사항', testId: 'section-missing' },
  { key: 'qaQuestions', label: 'QA 질문', testId: 'section-qa-questions' },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function ResultSection({ result, ...props }: ResultSectionProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('summary');

  const renderContent = () => {
    switch (activeTab) {
      case 'summary':
        return (
          <div data-testid="section-summary">
            <p className="text-gray-200 mb-4">{result.summary.overview}</p>
            <h4 className="text-sm font-semibold text-gray-400 mb-2">핵심 포인트</h4>
            <ul className="space-y-1">
              {result.summary.keyPoints.map((point, i) => (
                <li key={i} className="text-sm text-gray-300 flex gap-2">
                  <span className="text-indigo-400">•</span> {point}
                </li>
              ))}
            </ul>
          </div>
        );

      case 'features':
        return (
          <div data-testid="section-features">
            <div className="space-y-2">
              {result.features.features.map((f) => (
                <div key={f.id} className="bg-gray-950 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded-full">{f.category}</span>
                    <span className="text-sm font-semibold text-gray-200">{f.name}</span>
                  </div>
                  <p className="text-xs text-gray-400">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'testPoints':
        return (
          <div data-testid="section-test-points">
            <div className="space-y-2">
              {result.testPoints.testPoints.map((tp) => (
                <div key={tp.id} className="bg-gray-950 rounded-lg p-3 flex items-start gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 ${
                    tp.priority === 'high' ? 'bg-red-900/50 text-red-300' :
                    tp.priority === 'medium' ? 'bg-yellow-900/50 text-yellow-300' :
                    'bg-gray-800 text-gray-400'
                  }`}>{tp.priority}</span>
                  <div>
                    <span className="text-xs text-gray-500">[{tp.category}]</span>
                    <p className="text-sm text-gray-300">{tp.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'ambiguity':
        return (
          <div data-testid="section-ambiguity">
            <div className="space-y-3">
              {result.ambiguity.items.map((item, i) => (
                <div key={i} className={`bg-gray-950 rounded-lg p-3 border-l-3 ${
                  item.severity === 'critical' ? 'border-l-red-500' :
                  item.severity === 'warning' ? 'border-l-yellow-500' :
                  'border-l-blue-500'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      item.severity === 'critical' ? 'bg-red-900/50 text-red-300' :
                      item.severity === 'warning' ? 'bg-yellow-900/50 text-yellow-300' :
                      'bg-blue-900/50 text-blue-300'
                    }`}>{item.severity}</span>
                  </div>
                  <p className="text-sm text-gray-300 mb-1">&quot;{item.originalText}&quot;</p>
                  <p className="text-xs text-gray-400 mb-1">{item.issue}</p>
                  <p className="text-xs text-indigo-400">→ {item.suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'missingRequirements':
        return (
          <div data-testid="section-missing">
            <div className="space-y-2">
              {result.missingRequirements.items.map((item, i) => (
                <div key={i} className="bg-gray-950 rounded-lg p-3">
                  <span className="text-xs bg-orange-900/50 text-orange-300 px-2 py-0.5 rounded-full">{item.category}</span>
                  <p className="text-sm text-gray-300 mt-1">{item.description}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.reason}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'qaQuestions':
        return (
          <div data-testid="section-qa-questions">
            <div className="space-y-2">
              {result.qaQuestions.questions.map((q) => (
                <div key={q.id} data-testid="qa-question-item" className="bg-gray-950 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-indigo-400 font-mono text-xs">Q{q.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      q.priority === 'high' ? 'bg-red-900/50 text-red-300' :
                      q.priority === 'medium' ? 'bg-yellow-900/50 text-yellow-300' :
                      'bg-gray-800 text-gray-400'
                    }`}>{q.priority}</span>
                  </div>
                  <p className="text-sm text-gray-200">{q.question}</p>
                  <p className="text-xs text-gray-500 mt-1">{q.context}</p>
                </div>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <section className="bg-gray-900 rounded-xl p-6" data-testid={props['data-testid']}>
      {/* Metadata */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">분석 결과</h2>
        <div className="text-xs text-gray-500">
          {(result.metadata.processingTimeMs / 1000).toFixed(1)}초 소요 · {result.metadata.inputLength.toLocaleString()}자 분석
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            data-testid={tab.testId}
            className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition ${
              activeTab === tab.key
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[200px]">{renderContent()}</div>
    </section>
  );
}
