import { Router, Response } from 'express';
import { prisma } from './prisma';
import { authenticateJWT, AuthRequest } from './middleware';

const router = Router();
router.use(authenticateJWT);

router.get('/balance', async (req: AuthRequest, res: Response): Promise<void> => {
    const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { real_balance: true, demo_balance: true, kyc_status: true }
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json({ realBalance: user.real_balance.toNumber(), demoBalance: user.demo_balance.toNumber(), kycStatus: user.kyc_status });
});

router.post('/deposit', async (req: AuthRequest, res: Response): Promise<void> => {
    const num = parseFloat(req.body.amount);
    if (!num || num <= 0) { res.status(400).json({ error: 'Invalid deposit amount' }); return; }

    try {
        const result = await prisma.$transaction(async (tx: any) => {
            const user = await tx.user.findUnique({ where: { id: req.userId } });
            if (!user) throw new Error('User not found');

            const updatedUser = await tx.user.update({
                where: { id: req.userId },
                data: { real_balance: { increment: num } }
            });

            const method = req.body.method || 'UPI / Razorpay';
            const transaction = await tx.transaction.create({
                data: {
                    user_id: req.userId!,
                    type: 'DEPOSIT',
                    amount: num,
                    status: 'SUCCESS',
                    method
                }
            });

            return { transaction, newBalance: updatedUser.real_balance };
        });

        res.json({
            transaction: { id: result.transaction.id, type: result.transaction.type, amount: num, status: result.transaction.status, method: result.transaction.method, timestamp: result.transaction.timestamp.getTime() },
            newRealBalance: result.newBalance.toNumber()
        });
    } catch (e: any) {
        res.status(400).json({ error: e.message || 'Deposit failed' });
    }
});

router.post('/withdraw', async (req: AuthRequest, res: Response): Promise<void> => {
    const num = parseFloat(req.body.amount);
    if (!num || num < 100) { res.status(400).json({ error: 'Minimum withdrawal is $100' }); return; }

    try {
        const result = await prisma.$transaction(async (tx: any) => {
            const user = await tx.user.findUnique({ where: { id: req.userId } });
            if (!user) throw new Error('User not found');
            if (user.real_balance.toNumber() < num) throw new Error('Insufficient balance');

            const updatedUser = await tx.user.update({
                where: { id: req.userId },
                data: { real_balance: { decrement: num } }
            });

            const method = req.body.method || 'Bank Transfer';
            const transaction = await tx.transaction.create({
                data: {
                    user_id: req.userId!,
                    type: 'WITHDRAWAL',
                    amount: num,
                    status: 'PENDING',
                    method
                }
            });

            return { transaction, newBalance: updatedUser.real_balance };
        });

        res.json({
            transaction: { id: result.transaction.id, type: result.transaction.type, amount: num, status: result.transaction.status, method: result.transaction.method, timestamp: result.transaction.timestamp.getTime() },
            newRealBalance: result.newBalance.toNumber()
        });
    } catch (e: any) {
        res.status(400).json({ error: e.message || 'Withdrawal failed' });
    }
});

router.get('/transactions', async (req: AuthRequest, res: Response): Promise<void> => {
    const transactions = await prisma.transaction.findMany({
        where: { user_id: req.userId },
        orderBy: { timestamp: 'desc' },
        take: 50,
        select: { id: true, type: true, amount: true, status: true, method: true, timestamp: true }
    });

    // Map timestamp backwards compatibility and convert Decimal to Number
    res.json(transactions.map((t: any) => ({ ...t, amount: t.amount ? t.amount.toNumber() : 0, timestamp: t.timestamp.getTime() })));
});

export default router;
