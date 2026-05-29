
import React, { useState, useEffect } from 'react';
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

const BetControl: React.FC<Props> = ({
  balance, onBet, onCashout, isFlying, activeBet, currentMultiplier, isBettingPhase
}) => {
  const [amount, setAmount] = useState(10);
  const [autoCashoutValue, setAutoCashoutValue] = useState<string>('2.00');
  const [isAutoEnabled, setIsAutoEnabled] = useState(false);

  // Sync amount with balance if needed
  const handleAmountChange = (val: number) => {
    if (activeBet) return;
    setAmount(Math.max(1, Math.min(val, balance)));
  };

  const isCashedOut = activeBet?.cashoutAmount !== undefined;
  const effectiveMultiplier = isCashedOut ? (activeBet?.multiplier || 1) : currentMultiplier;
  const displayWin = (activeBet?.amount || amount) * effectiveMultiplier;

  return (
    <div className={`p-4 rounded-2xl flex flex-col gap-3 border transition-all w-full max-w-sm shadow-xl ${activeBet && !isCashedOut ? 'bg-[#1b1c1d] border-aviator-red/30' : 'bg-[#1b1c1d] border-[#2d2d2d]'
      }`}>
      <div className="flex justify-between items-center text-[10px] font-black text-gray-500 tracking-wider">
        <span>STAKE UNIT</span>
        <div className="flex gap-1.5">
          {[10, 50, 100, 500].map(val => (
            <button
              key={val}
              onClick={() => handleAmountChange(val)}
              disabled={!!activeBet}
              className={`px-2.5 py-1 rounded-md transition-all text-[11px] font-bold ${activeBet ? 'opacity-20 cursor-not-allowed' : 'bg-[#2d2d2d] hover:bg-aviator-red hover:text-white'
                } ${amount === val && !activeBet ? 'bg-aviator-red text-white' : ''}`}
            >
              {val}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="number"
            value={amount}
            onChange={(e) => handleAmountChange(Number(e.target.value))}
            disabled={!!activeBet || !isBettingPhase}
            className="bg-[#0d0d0d] border border-[#2d2d2d] rounded-xl px-4 py-3 w-full text-xl font-black tabular-nums focus:outline-none focus:border-aviator-red disabled:opacity-50 transition-all shadow-inner"
          />
        </div>

        <div className="flex flex-col bg-[#0d0d0d] border border-[#2d2d2d] rounded-xl p-2 min-w-[100px]">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[9px] font-black text-gray-600 uppercase">Auto</span>
            <input
              type="checkbox"
              checked={isAutoEnabled}
              disabled={!!activeBet}
              onChange={(e) => setIsAutoEnabled(e.target.checked)}
              className="w-4 h-4 accent-aviator-red cursor-pointer"
            />
          </div>
          <input
            type="number"
            step="0.01"
            placeholder="1.10"
            value={autoCashoutValue}
            onChange={(e) => setAutoCashoutValue(e.target.value)}
            disabled={!!activeBet || !isAutoEnabled}
            className="bg-transparent text-xs font-bold text-center w-full focus:outline-none text-aviator-red disabled:opacity-30"
          />
        </div>
      </div>

      {!activeBet ? (
        <button
          onClick={() => onBet(amount, isAutoEnabled ? parseFloat(autoCashoutValue) : undefined)}
          disabled={!isBettingPhase || amount > balance || amount <= 0}
          className={`w-full py-4 rounded-xl font-black text-xl tracking-tighter transition-all relative active:scale-95 shadow-lg ${isBettingPhase && amount <= balance && amount > 0
            ? 'bg-[#28a745] hover:bg-[#218838] text-white'
            : 'bg-[#2d2d2d] text-gray-500 cursor-not-allowed border border-white/5 shadow-none'
            }`}
        >
          {isBettingPhase ? 'BET' : 'WAITING FOR NEXT'}
        </button>
      ) : (
        <button
          onClick={!isCashedOut ? onCashout : undefined}
          disabled={!isFlying || isCashedOut}
          className={`w-full py-4 rounded-xl font-black text-xl tracking-tighter transition-all relative shadow-xl ${isCashedOut
              ? 'bg-[#2d2d2d] text-gray-500 opacity-60 border border-white/5 shadow-none cursor-not-allowed'
              : isFlying
                ? 'bg-[#ffc107] hover:bg-[#e0a800] text-black shadow-yellow-500/20 active:scale-95 cursor-pointer'
                : 'bg-[#2d2d2d] text-gray-500 cursor-not-allowed'
            }`}
        >
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-black opacity-60 tracking-widest mb-0.5">
              {isCashedOut ? `CASHED OUT @ ${effectiveMultiplier.toFixed(2)}x` : 'CASHOUT'}
            </span>
            <span className="text-2xl tabular-nums italic font-black">${displayWin.toFixed(2)}</span>
          </div>
        </button>
      )}
    </div>
  );
};

export default BetControl;
