interface ProgressBarProps {
  progress: number;
  message: string;
  testId?: string;
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-indigo-400"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default function ProgressBar({ progress, message, testId }: ProgressBarProps) {
  const isAnalyzing = progress > 0 && progress < 100;

  return (
    <section className="bg-gray-900 rounded-xl p-6 mb-6" data-testid={testId}>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          {isAnalyzing && <Spinner />}
          <span data-testid="progress-step" className="text-sm text-gray-300">{message}</span>
        </div>
        <span className="text-sm text-indigo-400 font-mono">{progress}%</span>
      </div>
      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-full bg-indigo-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
        {isAnalyzing && (
          <div className="h-full w-full bg-gradient-to-r from-transparent via-indigo-400/20 to-transparent animate-pulse" />
        )}
      </div>
      {isAnalyzing && (
        <p className="text-xs text-gray-500 mt-2 animate-pulse">
          AI가 요구사항을 분석하고 있습니다. 입력 길이에 따라 최대 3분 소요될 수 있습니다.
        </p>
      )}
    </section>
  );
}
