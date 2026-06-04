
import React from 'react';

interface Props {
  progress: number; // 0..1
}

const LoadingSplash: React.FC<Props> = ({ progress }) => {
  return (
    <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center pointer-events-none px-4 select-none bg-black/25">
      {/* Partner lockup */}
      <div className="flex items-center gap-4 sm:gap-6 mb-3">
        <span className="text-4xl sm:text-6xl font-black italic tracking-tighter text-[#e50539] drop-shadow-[0_2px_8px_rgba(229,5,57,0.4)]">
          UFC
        </span>
        <span className="w-px h-10 sm:h-14 bg-white/30" />
        <span className="flex items-center gap-1.5">
          <svg
            className="w-8 h-8 sm:w-11 sm:h-11 text-[#e50539]"
            viewBox="0 0 220 130"
            fill="currentColor"
          >
            <path d="M40 64 C 80 78 140 80 184 70 C 196 67 204 64 206 62 C 204 60 196 57 184 56 C 150 54 110 54 86 54 C 70 47 52 48 44 56 C 40 59 38 61 40 64 Z" />
            <path d="M44 60 L24 24 L42 28 L58 60 Z" />
            <path d="M104 70 L74 110 L112 110 L140 72 Z" />
          </svg>
          <span className="text-3xl sm:text-5xl font-black italic tracking-tighter text-[#e50539]">
            Aviator
          </span>
        </span>
      </div>

      <p className="text-white font-black text-lg sm:text-2xl tracking-[0.15em] mb-5">
        OFFICIAL PARTNERS
      </p>

      {/* Loading bar */}
      <div className="w-56 sm:w-72 h-1.5 rounded-full bg-white/10 overflow-hidden mb-6">
        <div
          className="h-full bg-[#e50539] rounded-full transition-[width] duration-100 ease-linear"
          style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
        />
      </div>

      {/* SPRIBE official game badge */}
      <div className="flex flex-col items-center gap-1 bg-black/40 border border-[#2f5a32] rounded-xl px-5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center text-[11px] font-black">
            S
          </span>
          <span className="text-white font-black tracking-widest text-sm">SPRIBE</span>
        </div>
        <div className="flex items-center gap-1.5 bg-[#143b16] border border-[#2f7a35] rounded-full px-2.5 py-0.5">
          <span className="text-[10px] font-bold text-[#6fe07a]">Official Game</span>
          <svg className="w-3.5 h-3.5 text-[#3fd14d]" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <span className="text-[9px] text-gray-400 font-semibold">Since 2019</span>
      </div>
    </div>
  );
};

export default LoadingSplash;
