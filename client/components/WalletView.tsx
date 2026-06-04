
import React, { useState } from 'react';
import { User, Transaction } from '../types';
import { api } from '../services/api';

interface Props {
  user: User;
  onUpdateUser: (u: User) => void;
  onAddTransaction: (t: Transaction) => void;
}

const QUICK = ['100', '500', '1000', '5000'];

export const WalletView: React.FC<Props> = ({ user, onUpdateUser, onAddTransaction }) => {
  const [amount, setAmount] = useState('500');
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const numAmount = parseFloat(amount) || 0;

  const handleDeposit = () => {
    if (numAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    setTimeout(() => {
      setShowCheckout(true);
      setIsProcessing(false);
    }, 600);
  };

  const finalizeDeposit = async (method: string) => {
    setSelectedMethod(method);
    setIsProcessing(true);
    setError(null);
    try {
      const result = await api.deposit(numAmount, method);
      const tx: Transaction = {
        id: result.transaction.id,
        type: 'DEPOSIT',
        amount: result.transaction.amount,
        status: 'SUCCESS',
        method: result.transaction.method,
        timestamp: result.transaction.timestamp,
      };
      onUpdateUser({ ...user, realBalance: result.newRealBalance });
      onAddTransaction(tx);
      setShowCheckout(false);
      setSuccess(`Deposited $${numAmount.toFixed(2)} successfully.`);
    } catch (err: any) {
      setError(err.message || 'Deposit failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (numAmount < 100) {
      setError('Minimum withdrawal is $100');
      return;
    }
    if (numAmount > user.realBalance) {
      setError('Insufficient real balance');
      return;
    }
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await api.withdraw(numAmount, 'Bank Transfer');
      const tx: Transaction = {
        id: result.transaction.id,
        type: 'WITHDRAWAL',
        amount: result.transaction.amount,
        status: 'PENDING',
        method: result.transaction.method,
        timestamp: result.transaction.timestamp,
      };
      onUpdateUser({ ...user, realBalance: result.newRealBalance });
      onAddTransaction(tx);
      setSuccess(`Withdrawal of $${numAmount.toFixed(2)} requested.`);
    } catch (err: any) {
      setError(err.message || 'Withdrawal failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full space-y-5">
      {/* Balance */}
      <div className="bg-[#0f1012] border border-[#2d2d2d] rounded-xl p-4">
        <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Balance</p>
        <p className="text-2xl font-black tabular-nums text-[#28d017]">
          ${user.realBalance.toFixed(2)}
        </p>
      </div>

      {error && (
        <div className="px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
          {error}
        </div>
      )}
      {success && (
        <div className="px-4 py-2.5 rounded-lg bg-[#28a909]/10 border border-[#28a909]/20 text-[#6fe07a] text-sm font-medium">
          {success}
        </div>
      )}

      {/* Deposit / Withdraw toggle */}
      <div className="flex bg-[#0f1012] rounded-full p-1 w-full max-w-xs mx-auto">
        <button
          type="button"
          onClick={() => { setMode('deposit'); setError(null); setSuccess(null); }}
          className={`flex-1 py-2 rounded-full text-xs font-bold transition-colors ${
            mode === 'deposit' ? 'bg-[#28a909] text-white' : 'text-gray-500'
          }`}
        >
          Deposit
        </button>
        <button
          type="button"
          onClick={() => { setMode('withdraw'); setError(null); setSuccess(null); }}
          className={`flex-1 py-2 rounded-full text-xs font-bold transition-colors ${
            mode === 'withdraw' ? 'bg-[#e50539] text-white' : 'text-gray-500'
          }`}
        >
          Withdraw
        </button>
      </div>

      {/* Amount controls */}
      <div className="bg-[#0f1012] border border-[#2d2d2d] rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-4 gap-2">
          {QUICK.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setAmount(v)}
              className={`py-2 rounded-lg text-xs font-bold transition-all ${
                amount === v
                  ? 'bg-[#e50539] text-white'
                  : 'bg-[#1b1c1d] text-gray-400 hover:text-white border border-[#2d2d2d]'
              }`}
            >
              ${v}
            </button>
          ))}
        </div>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-[#1b1c1d] border border-[#2d2d2d] rounded-xl px-4 py-3 text-2xl font-black tabular-nums focus:outline-none focus:border-[#e50539]"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">
            USD
          </span>
        </div>

        {mode === 'deposit' ? (
          <button
            type="button"
            onClick={handleDeposit}
            disabled={isProcessing}
            className="w-full py-3.5 rounded-xl font-black text-base btn-bet disabled:opacity-60"
          >
            {isProcessing ? 'Initiating…' : 'Deposit Now'}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleWithdraw}
              disabled={isProcessing || user.realBalance < 100}
              className="w-full py-3.5 rounded-xl font-black text-base bg-[#e50539] text-white hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing…' : 'Request Withdrawal'}
            </button>
            <p className="text-[10px] text-gray-600 text-center font-bold uppercase">
              Min withdrawal: $100.00
            </p>
          </>
        )}
      </div>

      {/* Razorpay-style checkout */}
      {showCheckout && (
        <div className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-[#2a2d42] p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-1.5 rounded text-xs font-black">R</div>
                <span className="font-bold text-sm">Razorpay Checkout</span>
              </div>
              <button type="button" onClick={() => setShowCheckout(false)}>
                ✕
              </button>
            </div>
            <div className="p-6 text-black">
              <div className="flex justify-between mb-8">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Payable Amount</p>
                  <p className="text-2xl font-black">₹{(numAmount * 83).toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Order ID</p>
                  <p className="text-xs font-mono font-bold">
                    #ORD_{Math.random().toString(36).substring(2, 8).toUpperCase()}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => finalizeDeposit('UPI / Razorpay')}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white text-[10px] font-black">
                      UPI
                    </div>
                    <span className="font-bold text-sm">UPI (GPay / PhonePe)</span>
                  </div>
                  <span>{isProcessing && selectedMethod === 'UPI / Razorpay' ? '…' : '→'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => finalizeDeposit('Card / Razorpay')}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white text-[10px] font-black">
                      CARD
                    </div>
                    <span className="font-bold text-sm">Credit / Debit Cards</span>
                  </div>
                  <span>{isProcessing && selectedMethod === 'Card / Razorpay' ? '…' : '→'}</span>
                </button>
              </div>
              <p className="text-[9px] text-center text-gray-400 mt-10 font-medium">
                By paying you agree to the Terms &amp; Conditions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
