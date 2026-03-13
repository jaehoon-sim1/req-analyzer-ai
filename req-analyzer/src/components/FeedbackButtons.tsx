'use client';

import { useState } from 'react';

interface FeedbackButtonsProps {
  sectionKey: string;
}

export default function FeedbackButtons({ sectionKey }: FeedbackButtonsProps) {
  const [showToast, setShowToast] = useState(false);

  const handleFeedback = (type: 'useful' | 'needs-improvement') => {
    const timestamp = Date.now();
    const key = `feedback-${sectionKey}-${timestamp}`;
    try {
      localStorage.setItem(key, JSON.stringify({ sectionKey, type, timestamp }));
    } catch {
      // localStorage not available
    }
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  return (
    <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-gray-800">
      {showToast && (
        <span className="text-xs text-green-400 mr-2 transition-opacity">
          피드백 감사합니다!
        </span>
      )}
      <button
        onClick={() => handleFeedback('useful')}
        className="px-2.5 py-1 text-xs border border-gray-700 rounded-md text-gray-400 hover:border-indigo-500 hover:text-indigo-400 transition"
        aria-label="유용함"
      >
        👍 유용함
      </button>
      <button
        onClick={() => handleFeedback('needs-improvement')}
        className="px-2.5 py-1 text-xs border border-gray-700 rounded-md text-gray-400 hover:border-orange-500 hover:text-orange-400 transition"
        aria-label="개선필요"
      >
        👎 개선필요
      </button>
    </div>
  );
}
