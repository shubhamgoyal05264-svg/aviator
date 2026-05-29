import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';
import { authenticateJWT, AuthRequest } from './middleware';

const router = Router();

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
    const user = await prisma.user.create({
        data: {
            username,
            email,
            password_hash: passwordHash,
            real_balance: 0,
            demo_balance: 5000,
            kyc_status: 'NONE',
            rounds_played: 0
        }
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, username: user.username, email: user.email, realBalance: 0, demoBalance: 5000, kycStatus: 'NONE', roundsPlayed: 0 } });
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
    res.json({
        token,
        user: { id: user.id, username: user.username, email: user.email, realBalance: user.real_balance.toNumber(), demoBalance: user.demo_balance.toNumber(), kycStatus: user.kyc_status, roundsPlayed: user.rounds_played }
    });
});

// ─── Me ───────────────────────────────────────────────────────────────────────
router.get('/me', authenticateJWT, async (req: AuthRequest, res: Response): Promise<void> => {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json({ id: user.id, username: user.username, email: user.email, realBalance: user.real_balance.toNumber(), demoBalance: user.demo_balance.toNumber(), kycStatus: user.kyc_status, roundsPlayed: user.rounds_played });
});

export default router;
