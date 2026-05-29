import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

export interface AuthRequest extends Request {
    userId?: string;
}

export function authenticateJWT(req: AuthRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized: no token provided' });
        return;
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET!;

    try {
        const payload = jwt.verify(token, secret) as { userId: string };
        req.userId = payload.userId;
        next();
    } catch {
        res.status(401).json({ error: 'Unauthorized: invalid token' });
    }
}

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    authenticateJWT(req, res, async () => {
        if (!req.userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
        const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { is_admin: true, banned: true } });
        if (!user || user.is_admin === 0) {
            res.status(403).json({ error: 'Forbidden: admin access required' });
            return;
        }
        next();
    });
}
