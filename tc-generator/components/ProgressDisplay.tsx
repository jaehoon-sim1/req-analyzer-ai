"use client";

interface Props {
  percent: number;
  message: string;
  stage: "analyzing" | "generating" | "finalizing";
}

const STAGES = [
  { key: "analyzing", label: "분석" },
  { key: "generating", label: "생성" },
  { key: "finalizing", label: "정리" },
] as const;

export default function ProgressDisplay({ percent, message, stage }: Props) {
  const radius = 50;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  const currentStageIndex = STAGES.findIndex((s) => s.key === stage);

  return (
    <div className="flex flex-col items-center justify-center py-12">
      {/* Circular progress */}
      <div className="relative w-28 h-28 mb-6">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={normalizedRadius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={stroke}
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r={normalizedRadius}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700 ease-in-out"
          />
        </svg>
        {/* Percentage text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-800">
            {Math.round(percent)}%
          </span>
        </div>
      </div>

      {/* Stage message */}
      <p className="text-sm text-gray-600 mb-4 transition-opacity duration-300">
        {message}
      </p>

      {/* Stage dots */}
      <div className="flex items-center gap-3">
        {STAGES.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <div
              className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
                i < currentStageIndex
                  ? "bg-green-500"
                  : i === currentStageIndex
                    ? "bg-blue-500 animate-pulse"
                    : "bg-gray-300"
              }`}
            />
            <span
              className={`text-xs ${
                i <= currentStageIndex ? "text-gray-700" : "text-gray-400"
              }`}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
