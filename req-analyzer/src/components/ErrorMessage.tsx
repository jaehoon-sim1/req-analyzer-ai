interface ErrorMessageProps {
  message: string;
  onDismiss: () => void;
}

export default function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  return (
    <div
      data-testid="error-message"
      role="alert"
      aria-live="assertive"
      className="bg-red-900/20 border border-red-800 rounded-xl p-4 mb-6 flex items-start gap-3"
    >
      <span className="text-red-400 text-lg shrink-0" aria-hidden="true">&#9888;</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-red-300 mb-1">오류 발생</p>
        <p className="text-sm text-red-400/90">{message}</p>
      </div>
      <button
        className="text-red-400 hover:text-red-300 text-sm ml-2 shrink-0 px-2 py-1 rounded hover:bg-red-900/30 transition"
        onClick={onDismiss}
        aria-label="오류 메시지 닫기"
      >
        닫기
      </button>
    </div>
  );
}
