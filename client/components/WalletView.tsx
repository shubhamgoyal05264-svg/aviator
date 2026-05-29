import React, { useState } from 'react';
import { User, Transaction } from '../types';
import { api } from '../services/api';

interface Props {
  user: User;
  onUpdateUser: (u: User) => void;
  onAddTransaction: (t: Transaction) => void;
}

export const WalletView: React.FC<Props> = ({ user, onUpdateUser, onAddTransaction }) => {
  const [amount, setAmount] = useState('500');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleDeposit = () => {
    setIsProcessing(true);
    setError(null);
    // Short delay to show Razorpay overlay animation feel
    setTimeout(() => {
      setShowCheckout(true);
      setIsProcessing(false);
    }, 800);
  };

  const finalizeDeposit = async (method: string) => {
    setSelectedMethod(method);
    setIsProcessing(true);
    setError(null);
    try {
      const num = parseFloat(amount);
      const result = await api.deposit(num, method);

      const tx: Transaction = {
        id: result.transaction.id,
        type: 'DEPOSIT',
        amount: result.transaction.amount,
        status: 'SUCCESS',
        method: result.transaction.method,
        timestamp: result.transaction.timestamp
      };

      onUpdateUser({ ...user, realBalance: result.newRealBalance });
      onAddTransaction(tx);
      setShowCheckout(false);
    } catch (err: any) {
      setError(err.message || 'Deposit failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    const num = parseFloat(amount);
    if (num < 100) { setError('Minimum withdrawal is $100'); return; }
    setIsProcessing(true);
    setError(null);
    try {
      const result = await api.withdraw(num, 'Bank Transfer');
      const tx: Transaction = {
        id: result.transaction.id,
        type: 'WITHDRAWAL',
        amount: result.transaction.amount,
        status: 'PENDING',
        method: result.transaction.method,
        timestamp: result.transaction.timestamp
      };
      onUpdateUser({ ...user, realBalance: result.newRealBalance });
      onAddTransaction(tx);
    } catch (err: any) {
      setError(err.message || 'Withdrawal failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full grid md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <h2 className="text-3xl font-black italic tracking-tighter">PILOT WALLET</h2>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
            {error}
          </div>
        )}

        <div className="bg-[#141516] p-6 rounded-3xl border border-white/5 space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] text-gray-500 font-black uppercase mb-1">Total Real Funds</p>
              <p className="text-4xl font-black tabular-nums text-yellow-400">${user.realBalance.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-500 font-black uppercase mb-1">KYC Status</p>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${user.kycStatus === 'VERIFIED'
                  ? 'bg-green-500/10 text-green-500'
                  : 'bg-red-500/10 text-red-500'
                }`}>{user.kycStatus}</span>
            </div>
          </div>
          <div className="h-px bg-white/5" />
          <div className="flex gap-4">
            <div className="flex-1 bg-[#0d0d0d] p-3 rounded-xl border border-white/5 text-center">
              <p className="text-[9px] text-gray-600 font-bold uppercase mb-1">Demo Balance</p>
              <p className="text-sm font-bold text-blue-400">${user.demoBalance.toFixed(2)}</p>
            </div>
            <div className="flex-1 bg-[#0d0d0d] p-3 rounded-xl border border-white/5 text-center">
              <p className="text-[9px] text-gray-600 font-bold uppercase mb-1">Real Balance</p>
              <p className="text-sm font-bold text-yellow-400">${user.realBalance.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#141516] p-6 rounded-3xl border border-white/5">
          <p className="text-[10px] text-gray-500 font-black uppercase mb-4">Quick Add Funds</p>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {['100', '500', '1000', '5000'].map(v => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${amount === v ? 'bg-aviator-red text-white' : 'bg-[#0d0d0d] text-gray-500 hover:text-white border border-white/5'}`}
              >
                ${v}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full bg-[#0d0d0d] border border-white/5 rounded-xl px-4 py-4 text-2xl font-black mb-4 focus:outline-none focus:border-aviator-red"
          />
          <button
            onClick={handleDeposit}
            disabled={isProcessing}
            className="w-full bg-[#28a745] py-4 rounded-xl font-black text-lg hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(40,167,69,0.3)] flex items-center justify-center gap-3"
          >
            {isProcessing ? 'INITIATING...' : 'DEPOSIT NOW'}
          </button>
        </div>
      </div>

      <div className="bg-[#141516] p-8 rounded-3xl border border-white/5 flex flex-col justify-center items-center text-center">
        <div className="w-20 h-20 bg-aviator-red/10 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-aviator-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold mb-2">Secure Withdrawal</h3>
        <p className="text-gray-500 text-sm mb-6 max-w-[250px]">
          Withdraw your winnings directly to your bank account or UPI ID.
        </p>
        <button
          onClick={handleWithdraw}
          disabled={isProcessing || user.realBalance < 100}
          className="w-full max-w-xs border border-white/10 py-3 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'PROCESSING...' : 'REQUEST WITHDRAWAL'}
        </button>
        <p className="text-[9px] text-gray-600 mt-4 uppercase font-bold">Min Withdrawal: $100.00</p>
      </div>

      {showCheckout && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-[#2a2d42] p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-1.5 rounded text-xs font-black">R</div>
                <span className="font-bold text-sm">Razorpay Checkout</span>
              </div>
              <button onClick={() => setShowCheckout(false)}>✕</button>
            </div>
            <div className="p-6 text-black">
              <div className="flex justify-between mb-8">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">PAYABLE AMOUNT</p>
                  <p className="text-2xl font-black">₹{(parseFloat(amount) * 83).toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">ORDER ID</p>
                  <p className="text-xs font-mono font-bold">#ORD_{Math.random().toString(36).substr(2, 6).toUpperCase()}</p>
                </div>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => finalizeDeposit('UPI / Razorpay')}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white text-[10px] font-black">UPI</div>
                    <span className="font-bold text-sm">UPI (GPay / PhonePe)</span>
                  </div>
                  <span>{isProcessing && selectedMethod === 'UPI / Razorpay' ? '...' : '→'}</span>
                </button>
                <button
                  onClick={() => finalizeDeposit('Card / Razorpay')}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white text-[10px] font-black">CARD</div>
                    <span className="font-bold text-sm">Credit / Debit Cards</span>
                  </div>
                  <span>{isProcessing && selectedMethod === 'Card / Razorpay' ? '...' : '→'}</span>
                </button>
              </div>
              <p className="text-[9px] text-center text-gray-400 mt-10 font-medium">By paying you agree to the Terms & Conditions.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
