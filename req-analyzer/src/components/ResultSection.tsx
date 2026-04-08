'use client';

import { useState, useEffect, useRef } from 'react';
import type { AnalysisResult, ConfidenceLevel } from '@/types/analysis';
import mermaid from 'mermaid';

async function downloadExport(result: AnalysisResult, format: 'excel' | 'json') {
  const response = await fetch('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ result, format }),
  });

  if (!response.ok) {
    throw new Error('내보내기에 실패했습니다.');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = format === 'excel' ? 'analysis-result.xlsx' : 'analysis-result.json';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

interface ResultSectionProps {
  result: AnalysisResult;
  testId?: string;
}

const TABS = [
  { key: 'summary', label: '요약', testId: 'section-summary' },
  { key: 'features', label: '기능 목록', testId: 'section-features' },
  { key: 'flowchart', label: '플로우차트', testId: 'section-flowchart' },
  { key: 'testPoints', label: '테스트 포인트', testId: 'section-test-points' },
  { key: 'ambiguity', label: '모호한 요구사항', testId: 'section-ambiguity' },
  { key: 'missingRequirements', label: '누락 요구사항', testId: 'section-missing' },
  { key: 'qaQuestions', label: 'QA 질문', testId: 'section-qa-questions' },
] as const;

type TabKey = typeof TABS[number]['key'];

function ConfidenceBadge({ confidence }: { confidence?: ConfidenceLevel }) {
  if (!confidence) return null;
  const badge = confidence === 'high' ? '🟢' : confidence === 'medium' ? '🟡' : '🔴';
  return <span className="ml-1" title={`신뢰도: ${confidence}`}>{badge}</span>;
}

function getSectionConfidence(result: AnalysisResult, key: TabKey): ConfidenceLevel | undefined {
  switch (key) {
    case 'summary': return result.summary.confidence;
    case 'features': return result.features.confidence;
    case 'flowchart': return result.flowchart?.confidence;
    case 'testPoints': return result.testPoints.confidence;
    case 'ambiguity': return result.ambiguity.confidence;
    case 'missingRequirements': return result.missingRequirements.confidence;
    case 'qaQuestions': return result.qaQuestions.confidence;
  }
}

function MermaidDiagram({ chart, id }: { chart: string; id: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [renderError, setRenderError] = useState<string>('');

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        primaryColor: '#6366f1',
        primaryTextColor: '#e0e7ff',
        primaryBorderColor: '#818cf8',
        lineColor: '#6366f1',
        secondaryColor: '#1e1b4b',
        tertiaryColor: '#312e81',
        background: '#0a0a1a',
        mainBkg: '#1e1b4b',
        nodeBorder: '#818cf8',
        clusterBkg: '#1e1b4b',
        titleColor: '#e0e7ff',
        edgeLabelBackground: '#1e1b4b',
      },
      flowchart: { curve: 'basis', htmlLabels: true },
    });

    async function render() {
      try {
        const { svg: renderedSvg } = await mermaid.render(`mermaid-${id}`, chart);
        setSvg(renderedSvg);
        setRenderError('');
      } catch {
        setRenderError('플로우차트 렌더링에 실패했습니다.');
        setSvg('');
      }
    }
    render();
  }, [chart, id]);

  if (renderError) {
    return (
      <div className="bg-gray-950 rounded-lg p-4">
        <p className="text-xs text-red-400 mb-2">{renderError}</p>
        <pre className="text-xs text-gray-500 overflow-x-auto whitespace-pre-wrap">{chart}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="bg-gray-950 rounded-lg p-4 overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export default function ResultSection({ result, testId }: ResultSectionProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('summary');
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingJson, setExportingJson] = useState(false);

  const handleExport = async (format: 'excel' | 'json') => {
    if (format === 'excel') setExportingExcel(true);
    else setExportingJson(true);
    try {
      await downloadExport(result, format);
    } catch {
      // 내보내기 실패 시 조용히 처리
    } finally {
      if (format === 'excel') setExportingExcel(false);
      else setExportingJson(false);
    }
  };

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
                    <span className="text-xs bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded-full">{f.category || '일반'}</span>
                    <span className="text-sm font-semibold text-gray-200">{f.name}</span>
                  </div>
                  <p className="text-xs text-gray-400">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'flowchart':
        return (
          <div data-testid="section-flowchart">
            {result.flowchart?.flows?.length > 0 ? (
              <div className="space-y-6">
                {result.flowchart.flows.map((flow, i) => (
                  <div key={i}>
                    <h4 className="text-sm font-semibold text-gray-200 mb-1">{flow.title}</h4>
                    <p className="text-xs text-gray-400 mb-3">{flow.description}</p>
                    <MermaidDiagram chart={flow.mermaid} id={`flow-${i}`} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">플로우차트를 생성하지 못했습니다.</p>
            )}
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
    <section className="bg-gray-900 rounded-xl p-6" data-testid={testId}>
      {/* Metadata */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">분석 결과</h2>
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-500">
            {(result.metadata.processingTimeMs / 1000).toFixed(1)}초 소요 · {result.metadata.inputLength.toLocaleString()}자 분석
          </div>
          <div className="flex items-center gap-1">
            <button
              data-testid="export-excel"
              onClick={() => handleExport('excel')}
              disabled={exportingExcel}
              className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-600 rounded-md text-gray-400 hover:border-indigo-500 hover:text-indigo-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exportingExcel ? '...' : '📊'} Excel
            </button>
            <button
              data-testid="export-json"
              onClick={() => handleExport('json')}
              disabled={exportingJson}
              className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-600 rounded-md text-gray-400 hover:border-indigo-500 hover:text-indigo-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exportingJson ? '...' : '📋'} JSON
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" className="flex gap-1 mb-4 overflow-x-auto pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            data-testid={tab.testId}
            className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition ${
              activeTab === tab.key
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            <ConfidenceBadge confidence={getSectionConfidence(result, tab.key)} />
          </button>
        ))}
      </div>

      {/* Content */}
      <div role="tabpanel" className="min-h-[200px]">{renderContent()}</div>
    </section>
  );
}
