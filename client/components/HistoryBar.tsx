
import React from 'react';

interface Props {
  history: number[];
}

const pillClass = (val: number) => {
  if (val >= 10) return 'history-pill history-pill--high';
  if (val >= 2) return 'history-pill history-pill--mid';
  return 'history-pill history-pill--low';
};

const HistoryBar: React.FC<Props> = ({ history }) => {
  return (
    <div className="history-bar flex-shrink-0 flex items-center gap-2 px-2 sm:px-3 py-1.5 bg-[#0b0e11] border-b border-[#2d2d2d] min-h-[36px]">
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide flex-1 justify-end min-w-0">
        {history.length === 0 ? (
          <span className="text-xs text-gray-600 italic">No rounds yet</span>
        ) : (
          history.slice(0, 24).map((val, idx) => (
            <span key={`${val}-${idx}`} className={pillClass(val)}>
              {val.toFixed(2)}x
            </span>
          ))
        )}
      </div>
      <button
        type="button"
        className="flex-shrink-0 w-7 h-7 rounded-md bg-[#1b1c1d] border border-[#2d2d2d] text-gray-400 hover:text-white flex items-center justify-center"
        aria-label="History menu"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
      </button>
    </div>
  );
};

export default HistoryBar;
