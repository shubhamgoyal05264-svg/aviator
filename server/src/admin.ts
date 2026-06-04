import { Router, Response } from 'express';
import { prisma } from './prisma';
import { requireAdmin, AuthRequest } from './middleware';
import { gameConfig } from './game';
import { newSecret } from './provider/signature';

const router = Router();
router.use(requireAdmin as any);

// ─── Operators (provider integrations) ──────────────────────────────────────────
router.get('/operators', async (_req, res: Response) => {
    const operators = await prisma.operator.findMany({ orderBy: { created_at: 'desc' } });
    const data = await Promise.all(operators.map(async (op: any) => ({
        id: op.id,
        name: op.name,
        secret_key: op.secret_key,
        callback_url: op.callback_url,
        currencies: op.currencies,
        active: op.active,
        created_at: op.created_at,
        players: await prisma.user.count({ where: { operator_id: op.id } }),
    })));
    res.json({ operators: data });
});

router.post('/operators', async (req: AuthRequest, res: Response): Promise<void> => {
    const { name, callback_url, currencies } = req.body;
    if (!name || !callback_url) { res.status(400).json({ error: 'name and callback_url are required' }); return; }
    try {
        const operator = await prisma.operator.create({
            data: {
                name: String(name),
                callback_url: String(callback_url),
                currencies: currencies ? String(currencies) : 'USD',
                secret_key: newSecret(),
            },
        });
        res.status(201).json({ operator });
    } catch (e: any) {
        res.status(409).json({ error: e?.code === 'P2002' ? 'Operator name already exists' : (e.message || 'Create failed') });
    }
});

router.patch('/operators/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { callback_url, currencies, active, rotateSecret } = req.body;
    const data: any = {};
    if (callback_url !== undefined) data.callback_url = String(callback_url);
    if (currencies !== undefined) data.currencies = String(currencies);
    if (active !== undefined) data.active = active ? 1 : 0;
    if (rotateSecret) data.secret_key = newSecret();
    try {
        const operator = await prisma.operator.update({ where: { id }, data });
        res.json({ operator });
    } catch {
        res.status(404).json({ error: 'Operator not found' });
    }
});

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
router.get('/stats', async (_req, res: Response) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [users, revenue, pendingWithdrawals, roundsToday, activeBets] = await Promise.all([
        prisma.user.count({ where: { is_admin: 0 } }),
        prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: 'DEPOSIT', status: 'SUCCESS' } }),
        prisma.transaction.count({ where: { type: 'WITHDRAWAL', status: 'PENDING' } }),
        prisma.round.count({ where: { started_at: { gte: todayStart } } }),
        prisma.bet.count({ where: { timestamp: { gte: todayStart } } }),
    ]);

    res.json({
        totalUsers: users,
        totalRevenue: revenue._sum.amount ? revenue._sum.amount.toNumber() : 0,
        pendingWithdrawals: pendingWithdrawals,
        roundsToday: roundsToday,
        betsToday: activeBets,
        houseEdge: gameConfig.houseEdgeRate,
        bettingDuration: gameConfig.bettingDuration,
    });
});

// ─── Users List ───────────────────────────────────────────────────────────────
router.get('/users', async (req: AuthRequest, res: Response) => {
    const search = req.query.search ? String(req.query.search) : '';
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const whereClause: any = { is_admin: 0 };
    if (search) {
        whereClause.OR = [
            { username: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
        ];
    }

    const users = await prisma.user.findMany({
        where: whereClause,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
        select: { id: true, username: true, email: true, real_balance: true, demo_balance: true, kyc_status: true, rounds_played: true, is_admin: true, banned: true, created_at: true }
    });

    const count = await prisma.user.count({ where: whereClause });

    // Format timestamps for frontend compatibility if needed, Prisma returns Date objects
    res.json({ users, total: count });
});

// ─── Single User Detail ───────────────────────────────────────────────────────
router.get('/users/:id', async (req, res: Response) => {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, username: true, email: true, real_balance: true, demo_balance: true, kyc_status: true, rounds_played: true, banned: true, created_at: true }
    });

    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const bets = await prisma.bet.findMany({
        where: { user_id: id },
        include: { round: { select: { crash_point: true } } },
        orderBy: { timestamp: 'desc' },
        take: 20
    });

    const txs = await prisma.transaction.findMany({
        where: { user_id: id },
        orderBy: { timestamp: 'desc' },
        take: 20
    });

    res.json({ user, recentBets: bets, recentTransactions: txs });
});

// ─── Adjust Balance ───────────────────────────────────────────────────────────
router.patch('/users/:id/balance', async (req, res: Response) => {
    const { id } = req.params;
    const { realBalance, demoBalance } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const data: any = {};
    if (realBalance !== undefined) data.real_balance = parseFloat(realBalance);
    if (demoBalance !== undefined) data.demo_balance = parseFloat(demoBalance);

    if (Object.keys(data).length > 0) {
        const updated = await prisma.user.update({
            where: { id },
            data,
            select: { real_balance: true, demo_balance: true }
        });
        res.json({ success: true, realBalance: updated.real_balance, demoBalance: updated.demo_balance });
    } else {
        res.json({ success: true, realBalance: user.real_balance, demoBalance: user.demo_balance });
    }
});

// ─── Ban / Unban ──────────────────────────────────────────────────────────────
router.patch('/users/:id/ban', async (req, res: Response) => {
    const { id } = req.params;
    const { banned } = req.body;
    await prisma.user.update({
        where: { id },
        data: { banned: banned ? 1 : 0 }
    });
    res.json({ success: true, banned: !!banned });
});

// ─── All Transactions ─────────────────────────────────────────────────────────
router.get('/transactions', async (req: AuthRequest, res: Response) => {
    const type = req.query.type as string | undefined;
    const status = req.query.status as string | undefined;
    const userId = req.query.userId as string | undefined;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const whereClause: any = {};
    if (type) whereClause.type = type;
    if (status) whereClause.status = status;
    if (userId) whereClause.user_id = userId;

    const txs = await prisma.transaction.findMany({
        where: whereClause,
        include: { user: { select: { username: true } } },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset
    });

    res.json(txs.map((tx: any) => ({
        ...tx,
        username: tx.user?.username
    })));
});

// ─── Update Transaction Status ────────────────────────────────────────────────
router.patch('/transactions/:id/status', async (req, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!['SUCCESS', 'REJECTED', 'PENDING'].includes(status)) {
        res.status(400).json({ error: 'Invalid status' }); return;
    }

    const tx = await prisma.transaction.findUnique({ where: { id } });
    if (!tx) { res.status(404).json({ error: 'Transaction not found' }); return; }

    // If rejecting a withdrawal, refund the balance
    if (status === 'REJECTED' && tx.type === 'WITHDRAWAL' && tx.status === 'PENDING') {
        await prisma.$transaction(async (prismaTx: any) => {
            await prismaTx.user.update({
                where: { id: tx.user_id },
                data: { real_balance: { increment: tx.amount } }
            });
            await prismaTx.transaction.update({
                where: { id },
                data: { status }
            });
        });
    } else {
        await prisma.transaction.update({
            where: { id },
            data: { status }
        });
    }

    res.json({ success: true, id, status });
});

// ─── All Bets ─────────────────────────────────────────────────────────────────
router.get('/bets', async (req: AuthRequest, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const username = req.query.username as string | undefined;

    const whereClause: any = {};
    if (username) {
        whereClause.user = { username: { contains: username, mode: 'insensitive' } };
    }

    const bets = await prisma.bet.findMany({
        where: whereClause,
        include: { 
            user: { select: { username: true } },
            round: { select: { crash_point: true } }
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset
    });

    const formatBets = bets.map((b: any) => {
        const amount = Number(b.amount);
        const cashout = b.cashout_amount ? Number(b.cashout_amount) : 0;
        const profitLoss = cashout > 0 ? (cashout - amount) : -amount;
        
        return {
            ...b,
            amount,
            cashout_amount: cashout,
            multiplier: b.multiplier ? Number(b.multiplier) : null,
            profit_loss: profitLoss,
            username: b.user?.username,
            crash_point: b.round?.crash_point ? Number(b.round.crash_point) : null
        };
    });

    const count = await prisma.bet.count({ where: whereClause });
    res.json({ bets: formatBets, total: count });
});

// ─── Round History ────────────────────────────────────────────────────────────
router.get('/rounds', async (req: AuthRequest, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const rounds = await prisma.round.findMany({
        include: { bets: true },
        orderBy: { started_at: 'desc' },
        take: limit,
        skip: offset
    });

    const formatRounds = rounds.map((r: any) => {
        const betCount = r.bets.length;
        const totalWagered = r.bets.reduce((sum: number, b: any) => sum + (b.amount ? Number(b.amount) : 0), 0);
        const totalPaidOut = r.bets.reduce((sum: number, b: any) => sum + (b.cashout_amount ? Number(b.cashout_amount) : 0), 0);

        return {
            ...r,
            crash_point: r.crash_point ? Number(r.crash_point) : 1,
            bet_count: betCount,
            total_wagered: totalWagered,
            total_paid_out: totalPaidOut
        };
    });

    const count = await prisma.round.count();
    res.json({ rounds: formatRounds, total: count });
});

// ─── Game Config ──────────────────────────────────────────────────────────────
router.get('/config', (_req, res: Response) => {
    res.json({
        houseEdgeRate: gameConfig.houseEdgeRate,
        bettingDuration: gameConfig.bettingDuration,
        crashTransition: gameConfig.crashTransition,
        tickInterval: gameConfig.tickInterval,
        maxMultiplier: gameConfig.maxMultiplier,
    });
});

router.patch('/config', async (req, res: Response) => {
    const { houseEdgeRate, bettingDuration, maxMultiplier } = req.body;
    if (houseEdgeRate !== undefined) gameConfig.houseEdgeRate = parseFloat(houseEdgeRate);
    if (bettingDuration !== undefined) gameConfig.bettingDuration = parseInt(bettingDuration);
    if (maxMultiplier !== undefined) gameConfig.maxMultiplier = parseFloat(maxMultiplier);
    res.json({ success: true, config: gameConfig });
});

export default router;
