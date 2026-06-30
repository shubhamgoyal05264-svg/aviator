import { Server as IOServer, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';
import { generateCrashPoint, generateRandomSeed, sha256, applyHoneymoonBias } from './provablyFair';
import { PlaceBetSchema } from './validators';
import * as wallet from './provider/walletService';

export const gameConfig = {
    bettingDuration: 8000,
    crashTransition: 3000,
    tickInterval: 100,
    houseEdgeRate: 0.065,
    maxMultiplier: 0,
};

interface ActiveBet {
    id: string;
    userId: string;
    username: string;
    slot: string;
    amount: number;
    currency: string;
    autoCashout?: number;
    cashedOut: boolean;
    cashoutMultiplier?: number;
    cashoutAmount?: number;
    isBot: boolean;
    // Seamless-wallet context (operator-backed players only)
    operatorId?: string | null;
    externalPlayerId?: string | null;
}

interface RoundState {
    id: string;
    phase: 'BETTING' | 'FLYING' | 'CRASHED';
    crashPoint: number;
    serverSeed: string;
    serverSeedHash: string;
    clientSeed: string;
    nonce: string;
    startTime: number;
    bettingStart: number;
    bets: Map<string, ActiveBet>;
}

export class GameEngine {
    private io: IOServer;
    private round: RoundState | null = null;
    private ticker: NodeJS.Timeout | null = null;
    private bettingTimer: NodeJS.Timeout | null = null;

    constructor(io: IOServer) {
        this.io = io;
    }

    start() {
        this.initRound().catch((err) => {
            console.error('[GameEngine] initRound failed, retrying in 5s:', err.message);
            setTimeout(() => this.start(), 5000);
        });
    }

    handleConnection(socket: Socket) {
        const token = socket.handshake.auth?.token as string | undefined;
        let userId: string | null = null;

        if (token) {
            try {
                const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; sessionId?: string; operatorId?: string };
                userId = payload.userId;
                socket.data.userId = userId;
                socket.join(`user:${userId}`);
                if (payload.sessionId) {
                    socket.data.sessionId = payload.sessionId;
                    // Resolve the operator-backed player context for seamless wallet calls.
                    prisma.gameSession.findUnique({
                        where: { id: payload.sessionId },
                        include: { user: { select: { operator_id: true, external_player_id: true } } },
                    }).then((s: any) => {
                        if (s) {
                            socket.data.currency = s.currency;
                            socket.data.operatorId = s.user.operator_id;
                            socket.data.externalPlayerId = s.user.external_player_id;
                        }
                    }).catch(() => {});
                }
            } catch { /* anonymous */ }
        }

        if (this.round) {
            socket.emit('round:state', {
                phase: this.round.phase,
                roundId: this.round.id,
                serverSeedHash: this.round.serverSeedHash,
                clientSeed: this.round.clientSeed,
                nonce: this.round.nonce,
                bettingStart: this.round.bettingStart,
                startTime: this.round.startTime,
                bets: this.getPublicBets()
            });
        }

        socket.on('bet:place', async (data: any) => {
            if (!userId) { socket.emit('error', { message: 'Not authenticated' }); return; }
            if (!this.round || this.round.phase !== 'BETTING') { socket.emit('error', { message: 'Betting phase is over' }); return; }

            let validatedData;
            try {
                validatedData = PlaceBetSchema.parse(data);
            } catch (e: any) {
                socket.emit('error', { message: 'Invalid bet parameters', details: e.errors });
                return;
            }

            const { slot, amount, autoCashout } = validatedData;
            // Operator players bet in their session currency; internal players use REAL.
            const operatorId = socket.data.operatorId as string | null | undefined;
            const externalPlayerId = socket.data.externalPlayerId as string | null | undefined;
            const currency = (socket.data.currency as string) || validatedData.currency || 'REAL';
            const betKey = `${userId}-${slot}`;
            if (this.round.bets.has(betKey)) { socket.emit('error', { message: 'Bet already placed for this slot' }); return; }

            try {
                const betId = uuidv4();
                const u = await prisma.user.findUnique({ where: { id: userId } });
                if (!u) throw new Error('User not found');

                const { balance } = await wallet.debit(
                    { id: u.id, operator_id: u.operator_id, external_player_id: u.external_player_id },
                    amount,
                    { roundId: this.round.id, txId: betId, currency }
                );

                await prisma.bet.create({
                    data: {
                        id: betId,
                        round_id: this.round.id,
                        user_id: userId,
                        slot,
                        amount,
                        currency,
                        auto_cashout: autoCashout,
                        timestamp: new Date(),
                    },
                });

                const bet: ActiveBet = {
                    id: betId, userId, username: u.username, slot, amount, currency, autoCashout,
                    cashedOut: false, isBot: false,
                    operatorId: u.operator_id, externalPlayerId: u.external_player_id,
                };
                this.round.bets.set(betKey, bet);

                this.io.to(`user:${userId}`).emit('wallet:balance', { balance, currency });
                this.io.emit('bet:placed', { id: betId, user: u.username, slot, amount, currency, autoCashout, isBot: false });
            } catch (e: any) {
                socket.emit('error', { message: e.message || 'Bet failed' });
            }
        });

        socket.on('bet:cashout', (data: { slot: string }) => {
            if (!userId) { socket.emit('error', { message: 'Not authenticated' }); return; }
            this.processCashout(userId, data.slot);
        });
    }

    private processCashout(userId: string, slot: string, forcedMult?: number): boolean {
        if (!this.round || this.round.phase !== 'FLYING') return false;

        const betKey = `${userId}-${slot}`;
        const bet = this.round.bets.get(betKey);
        if (!bet || bet.cashedOut) return false;

        const elapsed = (Date.now() - this.round.startTime) / 1000;
        const mult = parseFloat((forcedMult ?? Math.pow(Math.E, gameConfig.houseEdgeRate * elapsed)).toFixed(4));
        const winAmount = parseFloat((bet.amount * mult).toFixed(2));

        bet.cashedOut = true;
        bet.cashoutMultiplier = mult;
        bet.cashoutAmount = winAmount;

        // Credit the win via the wallet layer (internal balance or operator seamless API).
        (async () => {
            try {
                const { balance } = await wallet.credit(
                    { id: userId, operator_id: bet.operatorId ?? null, external_player_id: bet.externalPlayerId ?? null },
                    winAmount,
                    { roundId: this.round!.id, txId: uuidv4(), refTxId: bet.id, currency: bet.currency }
                );
                this.io.to(`user:${userId}`).emit('wallet:balance', { balance, currency: bet.currency });
            } catch (err) {
                console.error('Cashout credit error:', err);
            }
            await prisma.bet.update({
                where: { id: bet.id },
                data: { multiplier: mult, cashout_amount: winAmount },
            }).catch((err) => console.error('Cashout DB Error:', err));
        })();

        this.io.emit('bet:cashedout', { betId: bet.id, user: bet.username, slot, multiplier: mult, cashoutAmount: winAmount });
        return true;
    }

    private async initRound() {
        if (this.ticker) { clearInterval(this.ticker); this.ticker = null; }
        if (this.bettingTimer) { clearTimeout(this.bettingTimer); this.bettingTimer = null; }

        const serverSeed = generateRandomSeed();
        const serverSeedHash = sha256(serverSeed);
        const clientSeed = 'skyhigh-' + Math.random().toString(36).substring(7);
        const nonce = Date.now();
        const fairCrashPoint = generateCrashPoint(serverSeed, clientSeed, nonce, gameConfig.maxMultiplier);
        const roundId = uuidv4();
        const now = Date.now();

        this.round = {
            id: roundId, phase: 'BETTING',
            crashPoint: fairCrashPoint,
            serverSeed, serverSeedHash, clientSeed, nonce: String(nonce),
            startTime: 0, bettingStart: now,
            bets: new Map()
        };

        await prisma.round.create({
            data: {
                id: roundId,
                crash_point: fairCrashPoint,
                server_seed: serverSeed,
                server_seed_hash: serverSeedHash,
                client_seed: clientSeed,
                nonce: String(nonce),
                started_at: new Date(now)
            }
        });

        this.io.emit('round:betting', { roundId, serverSeedHash, clientSeed, nonce, bettingDuration: gameConfig.bettingDuration, startTime: now });
        this.spawnBots();
        this.bettingTimer = setTimeout(() => this.startFlying(), gameConfig.bettingDuration);
    }

    private startFlying() {
        if (!this.round) return;
        this.round.phase = 'FLYING';
        this.round.startTime = Date.now();
        this.io.emit('round:flying', { startTime: this.round.startTime });
        this.ticker = setInterval(() => this.tick(), gameConfig.tickInterval);
    }

    private async tick() {
        if (!this.round || this.round.phase !== 'FLYING') return;

        const elapsed = (Date.now() - this.round.startTime) / 1000;
        const multiplier = Math.pow(Math.E, gameConfig.houseEdgeRate * elapsed);

        let personalCrashTriggered = false;

        // This query loop in tick can be optimized, but ok for now
        for (const [, bet] of this.round.bets) {
            if (bet.isBot || bet.cashedOut) continue;

            if (bet.autoCashout && multiplier >= bet.autoCashout) {
                this.processCashout(bet.userId, bet.slot, bet.autoCashout);
                continue;
            }

            // Await is blocking tick if there are many users! 
            // In Phase 2 we will use Redis, but for now just don't wait in loop.
            // Actually, querying the DB in a 100ms tight loop is bad. We should fetch at betting end!
            const user = await prisma.user.findUnique({ where: { id: bet.userId }, select: { rounds_played: true } });
            if (user) {
                const personalCrash = applyHoneymoonBias(this.round.crashPoint, user.rounds_played);
                if (multiplier >= personalCrash) personalCrashTriggered = true;
            }
        }

        if (multiplier >= this.round.crashPoint || personalCrashTriggered) {
            this.crash(multiplier);
            return;
        }

        for (const [, bet] of this.round.bets) {
            if (bet.isBot && !bet.cashedOut && Math.random() < 0.03) {
                bet.cashedOut = true;
                bet.cashoutMultiplier = multiplier;
                this.io.emit('bet:cashedout', {
                    betId: bet.id, user: bet.username, slot: bet.slot,
                    multiplier: parseFloat(multiplier.toFixed(2)),
                    cashoutAmount: parseFloat((bet.amount * multiplier).toFixed(2)),
                    isBot: true
                });
            }
        }

        this.io.emit('round:tick', { multiplier: parseFloat(multiplier.toFixed(4)), elapsed });
    }

    private async crash(multiplier: number) {
        if (!this.ticker) return;
        clearInterval(this.ticker);
        this.ticker = null;
        if (!this.round) return;

        this.round.phase = 'CRASHED';
        const crashPoint = parseFloat(multiplier.toFixed(2));
        const crashedAt = Date.now();

        this.io.emit('round:crashed', {
            roundId: this.round.id, crashPoint,
            serverSeed: this.round.serverSeed,
            serverSeedHash: this.round.serverSeedHash,
            clientSeed: this.round.clientSeed,
            nonce: this.round.nonce, crashedAt
        });

        await prisma.round.update({
            where: { id: this.round.id },
            data: { crashed_at: new Date(crashedAt) }
        });

        const seen = new Set<string>();
        for (const [, bet] of this.round.bets) {
            if (!bet.isBot && !seen.has(bet.userId)) {
                seen.add(bet.userId);
                prisma.user.update({
                    where: { id: bet.userId },
                    data: { rounds_played: { increment: 1 } }
                }).catch(e => console.error(e));
            }
        }

        setTimeout(() => {
            this.initRound().catch((err) => console.error('[GameEngine] next round failed:', err.message));
        }, gameConfig.crashTransition);
    }

    private spawnBots() {
        if (!this.round) return;
        const names = ['Pilot_42', 'AceRider', 'MoonShot', 'GoldRush', 'SkyKing', 'NightBird', 'StormWing', 'IronClad', 'DriftKing', 'BlueStar', 'RedTail', 'ThunderX', 'VortexPro', 'SilverFox', 'CrashLord'];
        const amounts = [10, 20, 50, 100, 500];
        for (let i = 0; i < 15; i++) {
            const id = `bot-${i}-${this.round.id}`;
            const bet: ActiveBet = { id, userId: `bot-${i}`, username: names[i] ?? `Pilot_${1000 + i}`, slot: 'A', amount: amounts[Math.floor(Math.random() * amounts.length)], currency: 'REAL', cashedOut: false, isBot: true };
            this.round.bets.set(`bot-${i}`, bet);
            this.io.emit('bet:placed', { id, user: bet.username, slot: 'A', amount: bet.amount, currency: 'REAL', isBot: true });
        }
    }

    private getPublicBets() {
        if (!this.round) return [];
        return Array.from(this.round.bets.values()).map(b => ({
            id: b.id, user: b.username, amount: b.amount, currency: b.currency,
            cashedOut: b.cashedOut, cashoutMultiplier: b.cashoutMultiplier, isBot: b.isBot
        }));
    }
}
