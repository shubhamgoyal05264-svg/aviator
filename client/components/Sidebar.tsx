
import React, { useState } from 'react';
import { Bet } from '../types';
import Avatar from './Avatar';

interface Props {
  allBets: Bet[];
  previousBets: Bet[];
  topBets: Bet[];
  liveCount: number;
}

const maskName = (name: string) => {
  if (name === 'You') return 'You';
  if (name.length <= 2) return name;
  return `${name.charAt(0)}***${name.charAt(name.length - 1)}`;
};

const TABS = ['All Bets', 'Previous', 'Top'] as const;

const EMPTY_MSG: Record<(typeof TABS)[number], string> = {
  'All Bets': 'Waiting for bets…',
  Previous: 'No bets from the previous round.',
  Top: 'No big wins yet.',
};

const Sidebar: React.FC<Props> = ({ allBets, previousBets, topBets, liveCount }) => {
  const [tab, setTab] = useState<(typeof TABS)[number]>('All Bets');

  const rows = tab === 'All Bets' ? allBets : tab === 'Previous' ? previousBets : topBets;
  const totalWin = rows.reduce((sum, b) => sum + (b.cashoutAmount || 0), 0);
  const betCountLabel =
    tab === 'All Bets' ? `${rows.length}/${Math.max(liveCount, rows.length)}` : `${rows.length}`;

  return (
    <aside className="sidebar-panel order-2 lg:order-1 w-full lg:w-[280px] xl:w-[300px] flex-shrink-0 bg-[#141516] border-t lg:border-t-0 lg:border-r border-[#2d2d2d] flex flex-col min-h-0 max-h-[38vh] lg:max-h-none lg:h-full">
      <div className="flex items-center gap-1 px-2 pt-2 pb-1 bg-[#1b1c1d] rounded-t-xl mx-2 mt-2 mb-0 flex-shrink-0">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
              tab === t ? 'bg-[#3a3b3c] text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between px-3 py-2 mx-2 bg-[#1b1c1d] border-b border-[#2d2d2d] flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex -space-x-2 flex-shrink-0">
            {rows.slice(0, 3).map((b) => (
              <Avatar key={b.id} name={b.user} size={22} className="border-2 border-[#1b1c1d]" />
            ))}
          </div>
          <span className="text-[10px] sm:text-[11px] text-gray-400 font-semibold truncate">
            {betCountLabel} Bets
          </span>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-black tabular-nums">{totalWin.toFixed(2)}</p>
          <p className="text-[9px] text-gray-500 font-bold uppercase">Total win</p>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-x-2 px-3 py-1.5 text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase flex-shrink-0">
        <span>Player</span>
        <span className="text-right w-12 sm:w-14">Bet</span>
        <span className="text-right w-8 sm:w-10">X</span>
        <span className="text-right w-12 sm:w-14">Win</span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-1 scrollbar-thin">
        {rows.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-6 italic">{EMPTY_MSG[tab]}</p>
        ) : (
          rows.map((bet) => {
            const win = bet.cashoutAmount;
            return (
              <div
                key={bet.id}
                className={`grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-x-2 items-center px-2 py-1.5 my-0.5 rounded-lg text-[11px] sm:text-xs ${
                  win ? 'bg-[#143b16]/40 border border-[#2f7a35]/30' : 'bg-[#1b1c1d]'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Avatar name={bet.user} size={22} />
                  <span
                    className={`truncate ${
                      bet.user === 'You' ? 'text-[#e50539] font-bold' : 'text-gray-300'
                    }`}
                  >
                    {maskName(bet.user)}
                  </span>
                </div>
                <span className="text-right w-12 sm:w-14 font-semibold text-gray-200 tabular-nums">
                  {bet.amount.toFixed(2)}
                </span>
                <span
                  className={`text-right w-8 sm:w-10 font-bold tabular-nums ${
                    win ? 'text-[#6fe07a]' : 'text-gray-600'
                  }`}
                >
                  {win && bet.multiplier ? `${bet.multiplier.toFixed(2)}` : '-'}
                </span>
                <span
                  className={`text-right w-12 sm:w-14 font-bold tabular-nums ${
                    win ? 'text-[#6fe07a]' : 'text-gray-600'
                  }`}
                >
                  {win ? win.toFixed(2) : '-'}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between px-3 py-2 border-t border-[#2d2d2d] text-[9px] sm:text-[10px] text-gray-500 flex-shrink-0">
        <span className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-[#28a909]" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          Provably Fair
        </span>
        <span className="font-bold">
          <span className="text-white">SPRIBE</span>
        </span>
      </div>
    </aside>
  );
};

export default Sidebar;
