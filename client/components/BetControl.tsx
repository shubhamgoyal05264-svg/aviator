
import React, { useState } from 'react';
import { Bet } from '../types';

interface Props {
  balance: number;
  onBet: (amount: number, autoCashout?: number) => void;
  onCashout: () => void;
  isFlying: boolean;
  activeBet?: Bet;
  currentMultiplier: number;
  isBettingPhase: boolean;
}

const QUICK_AMOUNTS = [1, 2, 5, 10];

const BetControl: React.FC<Props> = ({
  balance,
  onBet,
  onCashout,
  isFlying,
  activeBet,
  currentMultiplier,
  isBettingPhase,
}) => {
  const [amount, setAmount] = useState(1);
  const [autoCashoutValue, setAutoCashoutValue] = useState('2.00');
  const [tab, setTab] = useState<'bet' | 'auto'>('bet');

  const handleAmountChange = (val: number) => {
    if (activeBet) return;
    setAmount(Math.max(0.1, Math.min(val, balance)));
  };

  const stepAmount = (delta: number) => {
    const step = amount >= 10 ? 5 : amount >= 5 ? 1 : 0.5;
    handleAmountChange(Math.round((amount + delta * step) * 100) / 100);
  };

  const isCashedOut = activeBet?.cashoutAmount !== undefined;
  const effectiveMultiplier = isCashedOut ? activeBet?.multiplier || 1 : currentMultiplier;
  const displayWin = (activeBet?.amount || amount) * effectiveMultiplier;
  const canBet = isBettingPhase && amount <= balance && amount > 0 && !activeBet;

  return (
    <div className="flex-1 min-w-0 bg-[#1b1c1d] rounded-xl sm:rounded-2xl border border-[#2d2d2d] p-2.5 sm:p-3 h-full">
      {/* Bet / Auto tabs */}
      <div className="flex items-center justify-center mb-3 relative">
        <div className="flex bg-[#0f1012] rounded-full p-0.5">
          <button
            type="button"
            onClick={() => setTab('bet')}
            className={`px-5 py-1 rounded-full text-xs font-bold transition-colors ${
              tab === 'bet' ? 'bg-[#3a3b3c] text-white' : 'text-gray-500'
            }`}
          >
            Bet
          </button>
          <button
            type="button"
            onClick={() => setTab('auto')}
            className={`px-5 py-1 rounded-full text-xs font-bold transition-colors ${
              tab === 'auto' ? 'bg-[#3a3b3c] text-white' : 'text-gray-500'
            }`}
          >
            Auto
          </button>
        </div>
      </div>

      <div className="flex gap-3 min-h-[96px]">
        {/* Left: controls */}
        <div className="flex flex-col gap-2 w-[46%] flex-shrink-0">
          <div className="flex items-center justify-between bg-[#0f1012] rounded-full px-1.5 py-1">
            <button
              type="button"
              onClick={() => stepAmount(-1)}
              disabled={!!activeBet}
              className="w-6 h-6 rounded-full bg-[#2d2d2d] text-gray-300 flex items-center justify-center text-lg leading-none disabled:opacity-30 hover:bg-[#3d3d3d]"
            >
              −
            </button>
            <input
              type="number"
              step="0.1"
              value={amount}
              onChange={(e) => handleAmountChange(Number(e.target.value))}
              disabled={!!activeBet || !isBettingPhase}
              className="w-full bg-transparent text-center text-base font-black tabular-nums focus:outline-none disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => stepAmount(1)}
              disabled={!!activeBet}
              className="w-6 h-6 rounded-full bg-[#2d2d2d] text-gray-300 flex items-center justify-center text-lg leading-none disabled:opacity-30 hover:bg-[#3d3d3d]"
            >
              +
            </button>
          </div>

          {tab === 'bet' ? (
            <div className="grid grid-cols-2 gap-1.5">
              {QUICK_AMOUNTS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleAmountChange(val)}
                  disabled={!!activeBet}
                  className={`py-1 rounded-md text-[11px] font-bold transition-all ${
                    activeBet
                      ? 'opacity-30 cursor-not-allowed bg-[#2d2d2d] text-gray-500'
                      : amount === val
                        ? 'bg-[#e50539] text-white'
                        : 'bg-[#2d2d2d] text-gray-300 hover:bg-[#3d3d3d]'
                  }`}
                >
                  {val.toFixed(2)}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-[#0f1012] rounded-md px-2 py-1.5">
              <span className="text-[9px] font-bold text-gray-500 uppercase">Auto X</span>
              <input
                type="number"
                step="0.01"
                min="1.01"
                value={autoCashoutValue}
                onChange={(e) => setAutoCashoutValue(e.target.value)}
                disabled={!!activeBet}
                className="flex-1 bg-transparent text-center text-sm font-bold text-[#e50539] focus:outline-none disabled:opacity-40"
              />
            </div>
          )}
        </div>

        {/* Right: action button */}
        {!activeBet ? (
          <button
            type="button"
            onClick={() =>
              onBet(amount, tab === 'auto' ? parseFloat(autoCashoutValue) || undefined : undefined)
            }
            disabled={!canBet}
            className={`flex-1 rounded-2xl flex flex-col items-center justify-center leading-tight border ${
              canBet
                ? 'btn-bet border-[#1f7a06]'
                : 'bg-[#2d2d2d] text-gray-500 border-white/5 cursor-not-allowed'
            }`}
          >
            <span className="text-xl font-black">{isBettingPhase ? 'Bet' : 'Waiting'}</span>
            {isBettingPhase && (
              <span className="text-base font-bold">
                {amount.toFixed(2)} <span className="text-[11px] opacity-80">USD</span>
              </span>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={!isCashedOut ? onCashout : undefined}
            disabled={!isFlying || isCashedOut}
            className={`flex-1 rounded-2xl flex flex-col items-center justify-center leading-tight ${
              isCashedOut
                ? 'bg-[#2d2d2d] text-gray-500 cursor-not-allowed'
                : isFlying
                  ? 'btn-cashout'
                  : 'bg-[#2d2d2d] text-gray-500 cursor-not-allowed'
            }`}
          >
            {isCashedOut ? (
              <span className="text-sm font-black">Cashed {effectiveMultiplier.toFixed(2)}x</span>
            ) : isFlying ? (
              <>
                <span className="text-sm font-black">Cash Out</span>
                <span className="text-base font-black tabular-nums">
                  {displayWin.toFixed(2)} <span className="text-[10px] opacity-80">USD</span>
                </span>
              </>
            ) : (
              <>
                <span className="text-sm font-black">Bet Placed</span>
                <span className="text-[11px] font-bold opacity-70">Waiting for flight…</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default BetControl;
