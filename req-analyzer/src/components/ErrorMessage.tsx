interface ErrorMessageProps {
  message: string;
  onDismiss: () => void;
}

export default function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  return (
    <div data-testid="error-message" className="bg-red-900/20 border border-red-800 rounded-xl p-4 mb-6 flex justify-between items-center">
      <span className="text-sm text-red-400">{message}</span>
      <button
        className="text-red-400 hover:text-red-300 text-sm ml-4"
        onClick={onDismiss}
      >
        닫기
      </button>
    </div>
  );
}
