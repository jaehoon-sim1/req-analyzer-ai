interface ProgressBarProps {
  progress: number;
  message: string;
  testId?: string;
}

export default function ProgressBar({ progress, message, testId }: ProgressBarProps) {
  return (
    <section className="bg-gray-900 rounded-xl p-6 mb-6" data-testid={testId}>
      <div className="flex justify-between items-center mb-2">
        <span data-testid="progress-step" className="text-sm text-gray-300">{message}</span>
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
      </div>
    </section>
  );
}
