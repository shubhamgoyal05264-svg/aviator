
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameStatus, Bet, Round, User, CurrencyMode, Transaction } from './types';
import { BETTING_DURATION, REFRESH_RATE } from './constants';
import GameCanvas from './components/GameCanvas';
import BetControl from './components/BetControl';
import Sidebar from './components/Sidebar';
import HistoryBar from './components/HistoryBar';
import LoadingSplash from './components/LoadingSplash';
import Avatar from './components/Avatar';
import { AuthView } from './components/AuthView';
import { WalletView } from './components/WalletView';
import { HistoryView } from './components/HistoryView';
import { getSocket, disconnectSocket } from './services/socket';
import { api } from './services/api';
import { sound } from './services/sound';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('skyhigh_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        parsed.realBalance = Number(parsed.realBalance || 0);
        parsed.demoBalance = Number(parsed.demoBalance || 0);
        return parsed;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [overlayView, setOverlayView] = useState<'WALLET' | 'HISTORY' | null>(null);

  const [status, setStatus] = useState<GameStatus>(GameStatus.BETTING);
  const [multiplier, setMultiplier] = useState(1.0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [activeRound, setActiveRound] = useState<Round | null>(null);
  const [betSlotA, setBetSlotA] = useState<Bet | null>(null);
  const [betSlotB, setBetSlotB] = useState<Bet | null>(null);
  const [allBets, setAllBets] = useState<Bet[]>([]);
  const [previousBets, setPreviousBets] = useState<Bet[]>([]);
  const [topBets, setTopBets] = useState<Bet[]>([]);
  const [history, setHistory] = useState<number[]>([]);

  const bettingStartRef = useRef<number>(0);
  const flyingStartRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const allBetsRef = useRef<Bet[]>([]);

  // Keep a live ref of the current round's bets for snapshotting
  useEffect(() => {
    allBetsRef.current = allBets;
  }, [allBets]);

  useEffect(() => {
    if (user) localStorage.setItem('skyhigh_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    const token = localStorage.getItem('skyhigh_token');
    if (!token) return;
    api.me().then((u) => setUser(u)).catch(() => {
      localStorage.removeItem('skyhigh_token');
      localStorage.removeItem('skyhigh_user');
    });
  }, []);

  // Load transaction history when opening the wallet/history overlay
  useEffect(() => {
    if (!overlayView) return;
    api.getTransactions()
      .then((txs) =>
        setTransactions(
          txs.map((t: any) => ({
            id: t.id,
            type: t.type,
            amount: Number(t.amount),
            status: t.status,
            method: t.method,
            timestamp: t.timestamp,
          }))
        )
      )
      .catch(() => {});
  }, [overlayView]);

  useEffect(() => {
    if (!user) return;

    const socket = getSocket();

    socket.on('round:betting', (data: {
      roundId: string;
      serverSeedHash: string;
      clientSeed: string;
      nonce: number;
      bettingDuration: number;
      startTime: number;
    }) => {
      setStatus(GameStatus.BETTING);
      setMultiplier(1.0);
      setTimeElapsed(0);
      setBetSlotA(null);
      setBetSlotB(null);
      // Snapshot the round that just ended into "Previous" before clearing
      if (allBetsRef.current.length > 0) setPreviousBets(allBetsRef.current);
      setAllBets([]);
      bettingStartRef.current = data.startTime;

      setActiveRound({
        id: data.roundId,
        crashPoint: 0,
        serverSeed: '',
        serverSeedHash: data.serverSeedHash,
        clientSeed: data.clientSeed,
        nonce: data.nonce,
        startTime: data.startTime,
      });

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - data.startTime;
        setTimeElapsed(Math.min(elapsed, data.bettingDuration));
      }, REFRESH_RATE);
    });

    socket.on('round:flying', (data: { startTime: number }) => {
      if (timerRef.current) clearInterval(timerRef.current);
      flyingStartRef.current = data.startTime;
      setStatus(GameStatus.FLYING);
      sound.playFlying();
    });

    socket.on('round:tick', (data: { multiplier: number; elapsed: number }) => {
      setMultiplier(data.multiplier);
      setTimeElapsed(data.elapsed);
    });

    socket.on('round:crashed', (data: {
      roundId: string;
      crashPoint: number;
      serverSeed: string;
      serverSeedHash: string;
      clientSeed: string;
      nonce: number;
      crashedAt: number;
    }) => {
      if (timerRef.current) clearInterval(timerRef.current);
      sound.stopFlying();
      sound.playCrash();
      setStatus(GameStatus.CRASHED);
      setMultiplier(data.crashPoint);

      setActiveRound((prev) =>
        prev
          ? { ...prev, crashPoint: data.crashPoint, serverSeed: data.serverSeed }
          : null
      );

      setHistory((prev) => [data.crashPoint, ...prev]);

      // Feed this round's winners into the "Top" tab (highest multipliers)
      const winners = allBetsRef.current.filter((b) => b.cashoutAmount && b.multiplier);
      if (winners.length > 0) {
        setTopBets((prev) => {
          const seen = new Set<string>();
          return [...winners, ...prev]
            .filter((b) => (seen.has(b.id) ? false : seen.add(b.id)))
            .sort((a, b) => (b.multiplier || 0) - (a.multiplier || 0))
            .slice(0, 50);
        });
      }

      api.me().then((freshUser) => setUser(freshUser)).catch(() => {});
    });

    socket.on('bet:placed', (bet: {
      id: string;
      user: string;
      slot?: 'A' | 'B';
      amount: number;
      currency?: CurrencyMode;
      isBot?: boolean;
    }) => {
      const isMine = !bet.isBot && bet.user === user.username;
      const newBet: Bet = {
        id: bet.id,
        userId: isMine ? user.id : bet.isBot ? `bot-${bet.id}` : '',
        user: isMine ? 'You' : bet.user,
        amount: bet.amount,
        currency: bet.currency || 'REAL',
        isBot: !!bet.isBot,
        timestamp: Date.now(),
      };
      setAllBets((prev) => [newBet, ...prev]);

      // Sync the optimistic slot to the server's real bet id so cashout matches
      if (isMine && bet.slot) {
        const syncId = (prev: Bet | null) =>
          prev && prev.cashoutAmount === undefined ? { ...prev, id: bet.id } : prev;
        if (bet.slot === 'A') setBetSlotA(syncId);
        else setBetSlotB(syncId);
      }
    });

    socket.on('bet:cashedout', (data: {
      betId: string;
      user: string;
      slot: string;
      multiplier: number;
      cashoutAmount: number;
      isBot?: boolean;
    }) => {
      setAllBets((prev) =>
        prev.map((b) =>
          b.id === data.betId
            ? { ...b, cashoutAmount: data.cashoutAmount, multiplier: data.multiplier }
            : b
        )
      );

      if (!data.isBot) {
        const updateSlot = (prev: Bet | null) =>
          prev && prev.id === data.betId
            ? { ...prev, cashoutAmount: data.cashoutAmount, multiplier: data.multiplier }
            : prev;
        setBetSlotA(updateSlot);
        setBetSlotB(updateSlot);
      }
    });

    socket.on('round:state', (data: {
      phase?: string;
      startTime?: number;
      bets?: Array<{
        id: string;
        userId?: string;
        user: string;
        amount: number;
        currency?: string;
        isBot?: boolean;
      }>;
    }) => {
      if (data.phase === 'FLYING') {
        setStatus(GameStatus.FLYING);
        flyingStartRef.current = data.startTime || Date.now();
      } else if (data.phase === 'BETTING') {
        setStatus(GameStatus.BETTING);
      }
      if (data.bets) {
        setAllBets(
          data.bets.map((b) => ({
            id: b.id,
            userId: b.userId || '',
            user: b.user,
            amount: b.amount,
            currency: b.currency || 'REAL',
            isBot: !!b.isBot,
            timestamp: Date.now(),
          }))
        );
      }
    });

    // Server rejected an action (e.g. insufficient balance) — roll back optimism
    socket.on('error', () => {
      setBetSlotA((prev) => (prev?.id.startsWith('pending-') ? null : prev));
      setBetSlotB((prev) => (prev?.id.startsWith('pending-') ? null : prev));
      api.me().then((freshUser) => setUser(freshUser)).catch(() => {});
    });

    return () => {
      socket.off('round:betting');
      socket.off('round:flying');
      socket.off('round:tick');
      socket.off('round:crashed');
      socket.off('bet:placed');
      socket.off('bet:cashedout');
      socket.off('round:state');
      socket.off('error');
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user]);

  const placeBet = (slot: 'A' | 'B', amount: number, autoCashout?: number) => {
    if (!user || status !== GameStatus.BETTING) return;
    if (amount > user.realBalance || amount <= 0) return;

    const socket = getSocket();
    socket.emit('bet:place', { slot, amount, currency: 'REAL', autoCashout });
    sound.playBet();

    const optimisticBet: Bet = {
      id: `pending-${slot}-${Date.now()}`,
      userId: user.id,
      user: 'You',
      amount,
      currency: 'REAL',
      autoCashout,
      isBot: false,
      timestamp: Date.now(),
    };
    if (slot === 'A') setBetSlotA(optimisticBet);
    else setBetSlotB(optimisticBet);

    setUser((u) => (u ? { ...u, realBalance: u.realBalance - amount } : null));
  };

  const handleCashout = useCallback(
    (slot: 'A' | 'B') => {
      if (status !== GameStatus.FLYING) return;
      const socket = getSocket();
      socket.emit('bet:cashout', { slot });

      const optimisticCashout = (prev: Bet | null) =>
        prev ? { ...prev, cashoutAmount: prev.amount * multiplier } : prev;

      if (slot === 'A') setBetSlotA(optimisticCashout);
      else setBetSlotB(optimisticCashout);
    },
    [status, multiplier]
  );

  const handleLogout = () => {
    disconnectSocket();
    localStorage.removeItem('skyhigh_token');
    localStorage.removeItem('skyhigh_user');
    setUser(null);
    setMenuOpen(false);
    setOverlayView(null);
  };

  const handleLogin = (newUser: User, _token: string) => {
    setUser(newUser);
  };

  if (!user) return <AuthView onLogin={handleLogin} />;

  const currentBalance = user.realBalance;

  return (
    <div className="app-shell flex flex-col h-dvh max-h-dvh w-full bg-[#0b0e11] text-white overflow-hidden font-inter">
      <header className="h-11 sm:h-12 flex-shrink-0 flex items-center justify-between px-3 sm:px-4 bg-[#141516] border-b border-[#2d2d2d] z-20">
        <div className="flex items-center gap-4">
          <span className="aviator-logo">Aviator</span>
          <span className="hidden sm:inline text-[10px] text-gray-600 font-bold uppercase tracking-widest">
            Provably Fair
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#1b1c1d] border border-[#2d2d2d] rounded-full px-3 py-1">
            <svg className="w-4 h-4 text-[#28d017]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-black tabular-nums text-[#28d017]">
              {currentBalance.toFixed(2)}
            </span>
            <span className="text-[10px] text-gray-500 font-bold">USD</span>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="p-2 rounded-lg hover:bg-[#2d2d2d] transition-colors"
              aria-label="Menu"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-[#1b1c1d] border border-[#2d2d2d] rounded-lg shadow-xl z-40 py-1">
                  <p className="px-3 py-2 text-[10px] text-gray-500 font-bold truncate border-b border-[#2d2d2d]">
                    {user.username}
                  </p>
                  <button
                    type="button"
                    onClick={() => { setOverlayView('WALLET'); setMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-[#2d2d2d] transition-colors"
                  >
                    Wallet / Deposit
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOverlayView('HISTORY'); setMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-[#2d2d2d] transition-colors"
                  >
                    History
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-[#2d2d2d] transition-colors border-t border-[#2d2d2d]"
                  >
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row overflow-hidden">
        <Sidebar
          allBets={allBets}
          previousBets={previousBets}
          topBets={topBets}
          liveCount={allBets.length}
        />

        <main className="game-main flex flex-1 flex-col min-w-0 min-h-0 order-1 lg:order-2 overflow-hidden">
          <HistoryBar history={history} />

          <section className="game-stage relative flex-1 min-h-0 bg-[#0b0e11] overflow-hidden">
            <GameCanvas status={status} multiplier={multiplier} timeElapsed={timeElapsed} />
            {status === GameStatus.BETTING && (
              <LoadingSplash progress={timeElapsed / BETTING_DURATION} />
            )}

            <button
              type="button"
              className="absolute top-2 right-2 z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#2d2d2d]/85 backdrop-blur flex items-center justify-center text-[#ffd400] hover:bg-[#3d3d3d]/90 transition-colors"
              aria-label="Effects"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6L12 2z" />
              </svg>
            </button>

            <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1.5 bg-black/45 rounded-full pl-1 pr-2.5 py-0.5 backdrop-blur pointer-events-none">
              <div className="flex -space-x-1.5">
                {allBets.slice(0, 3).map((b) => (
                  <Avatar key={b.id} name={b.user} size={20} className="border border-black/40" />
                ))}
              </div>
              <span className="text-[11px] font-bold text-gray-200 tabular-nums">
                {allBets.length}
              </span>
            </div>
          </section>

          <div className="bet-panels flex-shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 bg-[#141516] border-t border-[#2d2d2d] safe-area-pb">
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
        </main>
      </div>

      {/* Wallet / History overlay */}
      {overlayView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#141516] border border-[#2d2d2d] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2d2d2d] sticky top-0 bg-[#141516]">
              <h2 className="font-black text-lg">
                {overlayView === 'WALLET' ? 'Wallet' : 'History'}
              </h2>
              <button
                type="button"
                onClick={() => setOverlayView(null)}
                className="p-1.5 rounded-lg hover:bg-[#2d2d2d] text-gray-400"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5">
              {overlayView === 'WALLET' && (
                <WalletView
                  user={user}
                  onUpdateUser={setUser}
                  onAddTransaction={(t) => setTransactions((p) => [t, ...p])}
                />
              )}
              {overlayView === 'HISTORY' && (
                <HistoryView transactions={transactions} gameHistory={history} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
