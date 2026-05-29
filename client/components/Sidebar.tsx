
import React from 'react';
import { Bet } from '../types';

interface Props {
  allBets: Bet[];
  history: number[];
}

const Sidebar: React.FC<Props> = ({ allBets, history }) => {
  return (
    <div className="w-80 h-full bg-[#141516] border-r border-[#2d2d2d] flex flex-col hidden lg:flex">
      <div className="p-4 border-b border-[#2d2d2d]">
          <h2 className="text-sm font-bold text-gray-400">ALL BETS ({allBets.length})</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="grid grid-cols-3 text-[10px] text-gray-500 font-bold px-2 py-1">
          <span>USER</span>
          <span className="text-right">BET</span>
          <span className="text-right">WIN</span>
        </div>
        {allBets.map((bet) => (
          <div key={bet.id} className={`grid grid-cols-3 text-xs p-2 rounded ${bet.cashoutAmount ? 'bg-[#1b3d24]/30 border border-[#28a745]/20' : 'bg-[#1b1c1d]'}`}>
            <span className="truncate text-gray-300">{bet.user}</span>
            <span className="text-right font-semibold">{bet.amount.toFixed(0)}</span>
            <span className={`text-right font-bold ${bet.cashoutAmount ? 'text-[#28a745]' : 'text-gray-600'}`}>
              {bet.cashoutAmount ? (bet.amount * (bet.multiplier || 1)).toFixed(2) : '-'}
            </span>
          </div>
        ))}
      </div>

      <div className="p-4 bg-[#1b1c1d] border-t border-[#2d2d2d]">
        <h3 className="text-xs font-bold text-gray-500 mb-2">HISTORY</h3>
        <div className="flex flex-wrap gap-1">
          {history.slice(0, 10).map((val, idx) => (
            <span 
              key={idx} 
              className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                val > 2 ? 'bg-[#913ef8] text-white' : val > 1.5 ? 'bg-[#34b4ff] text-white' : 'bg-[#2d2d2d] text-gray-400'
              }`}
            >
              {val.toFixed(2)}x
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
