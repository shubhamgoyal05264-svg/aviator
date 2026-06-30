import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';
import { authenticateJWT, AuthRequest } from './middleware';

const router = Router();
const SIGNUP_BONUS = 500;

function formatUser(user: {
    id: string;
    username: string;
    email: string;
    real_balance: { toNumber(): number };
    demo_balance: { toNumber(): number };
    kyc_status: string;
    rounds_played: number;
}) {
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        realBalance: user.real_balance.toNumber(),
        demoBalance: user.demo_balance.toNumber(),
        kycStatus: user.kyc_status,
        roundsPlayed: user.rounds_played,
    };
}

// ─── Register ─────────────────────────────────────────────────────────────────
router.post('/register', async (req, res: Response): Promise<void> => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        res.status(400).json({ error: 'username, email and password are required' }); return;
    }
    if (password.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters' }); return;
    }

    const existing = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }] }
    });
    if (existing) { res.status(409).json({ error: 'Email or username already taken' }); return; }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.$transaction(async (tx: any) => {
        const created = await tx.user.create({
            data: {
                username,
                email,
                password_hash: passwordHash,
                real_balance: SIGNUP_BONUS,
                demo_balance: 0,
                kyc_status: 'NONE',
                rounds_played: 0,
            },
        });
        await tx.transaction.create({
            data: {
                user_id: created.id,
                type: 'DEPOSIT',
                amount: SIGNUP_BONUS,
                status: 'SUCCESS',
                method: 'Signup Bonus',
            },
        });
        return created;
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    res.status(201).json({ token, user: formatUser(user) });
});

// ─── Login ────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res: Response): Promise<void> => {
    const { email, password } = req.body;
    if (!email || !password) { res.status(400).json({ error: 'email and password are required' }); return; }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) { res.status(401).json({ error: 'Invalid credentials' }); return; }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) { res.status(401).json({ error: 'Invalid credentials' }); return; }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    res.json({ token, user: formatUser(user) });
});

// ─── Me ───────────────────────────────────────────────────────────────────────
router.get('/me', authenticateJWT, async (req: AuthRequest, res: Response): Promise<void> => {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(formatUser(user));
});

export default router;
