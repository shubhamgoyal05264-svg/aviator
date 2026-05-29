
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameStatus, Bet, Round, User, CurrencyMode, Transaction } from './types';
import { BETTING_DURATION, REFRESH_RATE, CRASH_TRANSITION_DURATION } from './constants';
import GameCanvas from './components/GameCanvas';
import BetControl from './components/BetControl';
import Sidebar from './components/Sidebar';
import { AuthView } from './components/AuthView';
import { WalletView } from './components/WalletView';
import { HistoryView } from './components/HistoryView';
import { getSocket, disconnectSocket } from './services/socket';
import { api } from './services/api';
import { sound } from './services/sound';

const App: React.FC = () => {
  // ─── Auth State ──────────────────────────────────────────────────────────────
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('skyhigh_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        parsed.realBalance = Number(parsed.realBalance || 0);
        parsed.demoBalance = Number(parsed.demoBalance || 0);
        return parsed;
      } catch { return null; }
    }
    return null;
  });
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>('DEMO');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [view, setView] = useState<'GAME' | 'WALLET' | 'HISTORY' | 'PROFILE'>('GAME');

  // ─── Game State (driven by socket events) ────────────────────────────────────
  const [status, setStatus] = useState<GameStatus>(GameStatus.BETTING);
  const [multiplier, setMultiplier] = useState(1.0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [activeRound, setActiveRound] = useState<Round | null>(null);
  const [betSlotA, setBetSlotA] = useState<Bet | null>(null);
  const [betSlotB, setBetSlotB] = useState<Bet | null>(null);
  const [allBets, setAllBets] = useState<Bet[]>([]);
  const [history, setHistory] = useState<number[]>([]);

  const bettingStartRef = useRef<number>(0);
  const flyingStartRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  // ─── Persist user to localStorage ────────────────────────────────────────────
  useEffect(() => {
    if (user) localStorage.setItem('skyhigh_user', JSON.stringify(user));
  }, [user]);

  // ─── Restore session on page load via /api/auth/me ───────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('skyhigh_token');
    if (!token) return;
    api.me().then(u => setUser(u)).catch(() => {
      localStorage.removeItem('skyhigh_token');
      localStorage.removeItem('skyhigh_user');
    });
  }, []);

  // ─── Socket.io Event Handlers ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const socket = getSocket();

    // ── BETTING phase ────────────────────────────────────────────────────────
    socket.on('round:betting', (data: {
      roundId: string; serverSeedHash: string; clientSeed: string;
      nonce: number; bettingDuration: number; startTime: number;
    }) => {
      setStatus(GameStatus.BETTING);
      setMultiplier(1.0);
      setTimeElapsed(0);
      setBetSlotA(null);
      setBetSlotB(null);
      setAllBets([]);

      bettingStartRef.current = data.startTime;

      setActiveRound({
        id: data.roundId,
        crashPoint: 0,          // unknown until crash
        serverSeed: '',          // unknown until crash
        serverSeedHash: data.serverSeedHash,
        clientSeed: data.clientSeed,
        nonce: data.nonce,
        startTime: data.startTime
      });

      // Countdown timer during betting
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - data.startTime;
        setTimeElapsed(Math.min(elapsed, data.bettingDuration));
      }, REFRESH_RATE);
    });

    // ── FLYING phase ─────────────────────────────────────────────────────────
    socket.on('round:flying', (data: { startTime: number }) => {
      if (timerRef.current) clearInterval(timerRef.current);
      flyingStartRef.current = data.startTime;
      setStatus(GameStatus.FLYING);
      sound.playFlying();
    });

    // ── TICK (server sends mult every 100ms) ─────────────────────────────────
    socket.on('round:tick', (data: { multiplier: number; elapsed: number }) => {
      setMultiplier(data.multiplier);
      setTimeElapsed(data.elapsed);
    });

    // ── CRASHED ──────────────────────────────────────────────────────────────
    socket.on('round:crashed', (data: {
      roundId: string; crashPoint: number; serverSeed: string;
      serverSeedHash: string; clientSeed: string; nonce: number; crashedAt: number;
    }) => {
      if (timerRef.current) clearInterval(timerRef.current);
      sound.stopFlying();
      sound.playCrash();
      setStatus(GameStatus.CRASHED);
      setMultiplier(data.crashPoint);

      setActiveRound(prev => prev ? {
        ...prev,
        crashPoint: data.crashPoint,
        serverSeed: data.serverSeed,
      } : null);

      setHistory(prev => {
        const next = [data.crashPoint, ...prev];
        return next;
      });

      // Refresh balance from server after round
      api.me().then(freshUser => setUser(freshUser)).catch(() => { });
    });

    // ── Bet placed by anyone ──────────────────────────────────────────────────
    socket.on('bet:placed', (bet: any) => {
      const newBet: Bet = {
        id: bet.id,
        userId: bet.isBot ? `bot-${bet.id}` : user.id,
        user: bet.user,
        amount: bet.amount,
        currency: bet.currency || 'REAL',
        isBot: bet.isBot,
        timestamp: Date.now()
      };
      setAllBets(prev => [newBet, ...prev]);
    });

    // ── Cashout confirmed by server ────────────────────────────────────────────
    socket.on('bet:cashedout', (data: {
      betId: string; user: string; slot: string;
      multiplier: number; cashoutAmount: number; isBot?: boolean;
    }) => {
      setAllBets(prev => prev.map(b =>
        b.id === data.betId
          ? { ...b, cashoutAmount: data.cashoutAmount, multiplier: data.multiplier }
          : b
      ));

      // Update our own slots
      if (!data.isBot) {
        const updateSlot = (prev: Bet | null) =>
          prev && prev.id === data.betId
            ? { ...prev, cashoutAmount: data.cashoutAmount, multiplier: data.multiplier }
            : prev;
        setBetSlotA(updateSlot);
        setBetSlotB(updateSlot);
      }
    });

    // ── Current state on connect (if rejoining mid-round) ─────────────────────
    socket.on('round:state', (data: any) => {
      if (data.phase === 'FLYING') {
        setStatus(GameStatus.FLYING);
        flyingStartRef.current = data.startTime || Date.now();
        // optionally play flying sound if rejoining mid-flight, but requires user interaction first
      } else if (data.phase === 'BETTING') {
        setStatus(GameStatus.BETTING);
      }
      if (data.bets) {
        setAllBets(data.bets.map((b: any) => ({
          id: b.id, userId: b.userId || '', user: b.user, amount: b.amount,
          currency: b.currency || 'REAL', isBot: !!b.isBot, timestamp: Date.now()
        })));
      }
    });

    return () => {
      socket.off('round:betting');
      socket.off('round:flying');
      socket.off('round:tick');
      socket.off('round:crashed');
      socket.off('bet:placed');
      socket.off('bet:cashedout');
      socket.off('round:state');
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user]);

  // ─── Place Bet ────────────────────────────────────────────────────────────────
  const placeBet = (slot: 'A' | 'B', amount: number, autoCashout?: number) => {
    if (!user || status !== GameStatus.BETTING) return;
    const balanceKey = currencyMode === 'REAL' ? 'realBalance' : 'demoBalance';
    if (amount > user[balanceKey] || amount <= 0) return;

    const socket = getSocket();
    socket.emit('bet:place', { slot, amount, currency: currencyMode, autoCashout });
    
    sound.playBet();

    // Optimistically show the bet in our slot
    const optimisticBet: Bet = {
      id: `pending-${slot}-${Date.now()}`,
      userId: user.id,
      user: 'You',
      amount,
      currency: currencyMode,
      autoCashout,
      isBot: false,
      timestamp: Date.now()
    };
    if (slot === 'A') setBetSlotA(optimisticBet);
    else setBetSlotB(optimisticBet);

    // Optimistically deduct balance
    setUser(u => u ? { ...u, [balanceKey]: u[balanceKey] - amount } : null);
  };

  // ─── Cashout ─────────────────────────────────────────────────────────────────
  const handleCashout = useCallback((slot: 'A' | 'B') => {
    if (status !== GameStatus.FLYING) return;
    const socket = getSocket();
    socket.emit('bet:cashout', { slot });

    // Optimistically disable the cashout button
    const optimisticCashout = (prev: Bet | null) =>
      prev ? { ...prev, cashoutAmount: (prev.amount * multiplier) } : prev;

    if (slot === 'A') setBetSlotA(optimisticCashout);
    else setBetSlotB(optimisticCashout);
  }, [status, multiplier]);

  // ─── Logout ──────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    disconnectSocket();
    localStorage.removeItem('skyhigh_token');
    localStorage.removeItem('skyhigh_user');
    setUser(null);
  };

  // ─── Login handler ────────────────────────────────────────────────────────────
  const handleLogin = (newUser: User, _token: string) => {
    setUser(newUser);
  };

  if (!user) return <AuthView onLogin={handleLogin} />;

  const currentBalance = currencyMode === 'REAL' ? user.realBalance : user.demoBalance;

  return (
    <div className="flex h-screen bg-[#0d0d0d] text-white overflow-hidden font-inter">
      <nav className="w-20 bg-[#141516] border-r border-white/5 flex flex-col items-center py-6 gap-8">
        <div className="text-aviator-red font-black italic text-xl">SH</div>
        <button onClick={() => setView('GAME')} className={`p-3 rounded-xl transition-all ${view === 'GAME' ? 'bg-aviator-red text-white shadow-lg shadow-red-500/20' : 'text-gray-500 hover:text-white'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </button>
        <button onClick={() => setView('WALLET')} className={`p-3 rounded-xl transition-all ${view === 'WALLET' ? 'bg-aviator-red text-white shadow-lg shadow-red-500/20' : 'text-gray-500 hover:text-white'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </button>
        <button onClick={() => setView('HISTORY')} className={`p-3 rounded-xl transition-all ${view === 'HISTORY' ? 'bg-aviator-red text-white shadow-lg shadow-red-500/20' : 'text-gray-500 hover:text-white'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </button>
        <div className="mt-auto">
          <button onClick={handleLogout} className="p-3 text-gray-600 hover:text-red-500 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </nav>

      <div className="flex-1 flex flex-col relative">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#0d0d0d]/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Active Pilot</span>
              <span className="text-sm font-bold">{user.username}</span>
            </div>
            <div className="h-8 w-px bg-white/5" />
            <div className="flex items-center gap-3 bg-[#1b1c1d] px-4 py-1.5 rounded-full border border-white/5">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded ${currencyMode === 'REAL' ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-500'}`}>{currencyMode}</span>
              <span className="text-yellow-400 font-black tabular-nums font-mono">${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              <button onClick={() => setCurrencyMode(m => m === 'REAL' ? 'DEMO' : 'REAL')} className="text-gray-500 hover:text-white transition-transform active:rotate-180">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setView('WALLET')} className="bg-aviator-red text-white px-5 py-2 rounded-lg font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-[0_4px_15px_rgba(229,30,37,0.4)]">DEPOSIT</button>
          </div>
        </header>

        <main className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
          {view === 'GAME' && (
            <>
              <div className="flex-1 min-h-[350px] relative rounded-3xl overflow-hidden border border-white/5 shadow-2xl bg-black">
                <GameCanvas status={status} multiplier={multiplier} timeElapsed={timeElapsed} />
                {status === GameStatus.BETTING && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
                    <div className="text-center animate-pulse">
                      <p className="text-gray-400 text-xs font-black tracking-[0.3em] mb-2 uppercase">Awaiting Flight</p>
                      <p className="text-7xl font-black italic tabular-nums">
                        {Math.max(0, Math.ceil((BETTING_DURATION - timeElapsed) / 1000))}s
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col lg:flex-row gap-6 items-stretch">
                <div className="flex-1 flex flex-col md:flex-row gap-4">
                  <BetControl
                    balance={currentBalance}
                    onBet={(amt, ac) => placeBet('A', amt, ac)}
                    onCashout={() => handleCashout('A')}
                    isFlying={status === GameStatus.FLYING}
                    activeBet={betSlotA || undefined}
                    currentMultiplier={multiplier}
                    isBettingPhase={status === GameStatus.BETTING}
                  />
                  <BetControl
                    balance={currentBalance}
                    onBet={(amt, ac) => placeBet('B', amt, ac)}
                    onCashout={() => handleCashout('B')}
                    isFlying={status === GameStatus.FLYING}
                    activeBet={betSlotB || undefined}
                    currentMultiplier={multiplier}
                    isBettingPhase={status === GameStatus.BETTING}
                  />
                </div>
                <div className="w-full lg:w-72 bg-[#141516] rounded-2xl p-4 border border-white/5 flex flex-col max-h-[300px] lg:max-h-none overflow-hidden">
                  <p className="text-[10px] text-gray-500 font-black mb-4 uppercase tracking-widest">Global Terminal</p>
                  <div className="space-y-2 overflow-y-auto scrollbar-hide pr-1">
                    {allBets.slice(0, 12).map(b => (
                      <div key={b.id} className={`flex justify-between items-center text-xs p-2 rounded border border-white/5 transition-colors ${b.cashoutAmount ? 'bg-green-500/10 border-green-500/20' : 'bg-[#0d0d0d]'}`}>
                        <span className={`${b.user === 'You' ? 'text-aviator-red font-black' : 'text-gray-400'}`}>{b.user}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-yellow-500">${b.amount}</span>
                          {b.cashoutAmount && <span className="text-green-500 font-bold">x{b.multiplier?.toFixed(2)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {view === 'WALLET' && <WalletView user={user} onUpdateUser={setUser} onAddTransaction={(t) => setTransactions(p => [t, ...p])} />}
          {view === 'HISTORY' && <HistoryView transactions={transactions} gameHistory={history} />}
        </main>
      </div>
    </div>
  );
};

export default App;
