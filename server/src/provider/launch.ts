import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../prisma';
import { walletClient } from './walletClient';

const router = Router();

const GAME_CLIENT_URL = process.env.GAME_CLIENT_URL || 'http://localhost:5173';

async function findOperator(idOrName: string) {
    const byId = idOrName.match(/^[0-9a-f-]{36}$/i)
        ? await prisma.operator.findUnique({ where: { id: idOrName } })
        : null;
    return byId || prisma.operator.findUnique({ where: { name: idOrName } });
}

/** Get-or-create the local shadow player for an operator + external player id. */
async function upsertPlayer(operatorId: string, externalPlayerId: string, nickname?: string) {
    const existing = await prisma.user.findFirst({
        where: { operator_id: operatorId, external_player_id: externalPlayerId },
    });
    if (existing) return existing;

    const shortOp = operatorId.slice(0, 8);
    return prisma.user.create({
        data: {
            username: `${shortOp}:${externalPlayerId}`.slice(0, 60),
            email: `${externalPlayerId}.${operatorId}@provider.local`,
            password_hash: crypto.randomBytes(16).toString('hex'),
            real_balance: 0,
            demo_balance: 0,
            operator_id: operatorId,
            external_player_id: externalPlayerId,
        },
    });
}

/**
 * Operator launch entry point.
 *
 *   GET /api/provider/launch?operator=<id|name>&token=<launchToken>&lang=EN&return_url=...
 *
 * Flow: validate operator → authenticate token against operator wallet → create the
 * shadow player + a game session → mint a session JWT → redirect into the game client.
 */
router.get('/launch', async (req: Request, res: Response): Promise<void> => {
    try {
        const operatorRef = String(req.query.operator || '');
        const token = String(req.query.token || '');
        const lang = String(req.query.lang || 'EN');
        const returnUrl = req.query.return_url ? String(req.query.return_url) : '';

        if (!operatorRef || !token) { res.status(400).send('Missing operator or token'); return; }

        const operator = await findOperator(operatorRef);
        if (!operator || operator.active === 0) { res.status(404).send('Unknown or inactive operator'); return; }

        const auth = await walletClient.authenticate(
            { id: operator.id, secret_key: operator.secret_key, callback_url: operator.callback_url },
            token
        );

        const allowed = operator.currencies.split(',').map((c) => c.trim().toUpperCase());
        const currency = (auth.currency || allowed[0] || 'USD').toUpperCase();
        if (!allowed.includes(currency)) { res.status(400).send(`Currency ${currency} not allowed for operator`); return; }

        const player = await upsertPlayer(operator.id, auth.playerId, auth.nickname);

        // Mirror the operator balance locally for display.
        await prisma.user.update({ where: { id: player.id }, data: { real_balance: auth.balance } });

        const session = await prisma.gameSession.create({
            data: { operator_id: operator.id, user_id: player.id, currency, launch_token: token },
        });

        const sessionJwt = jwt.sign(
            { userId: player.id, sessionId: session.id, operatorId: operator.id, provider: true },
            process.env.JWT_SECRET!,
            { expiresIn: '4h' }
        );

        const params = new URLSearchParams({ session: sessionJwt, currency, lang });
        if (returnUrl) params.set('return_url', returnUrl);
        res.redirect(`${GAME_CLIENT_URL.replace(/\/+$/, '')}/?${params.toString()}`);
    } catch (e: any) {
        console.error('[provider/launch] error:', e.message);
        res.status(400).send(`Launch failed: ${e.message}`);
    }
});

/** Lightweight session info for the client (balance + currency + operator). */
router.get('/session', async (req: Request, res: Response): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) { res.status(401).json({ error: 'No token' }); return; }
    try {
        const payload = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET!) as any;
        if (!payload.sessionId) { res.status(400).json({ error: 'Not a provider session' }); return; }
        const session = await prisma.gameSession.findUnique({
            where: { id: payload.sessionId },
            include: { user: true, operator: { select: { name: true } } },
        });
        if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
        res.json({
            currency: session.currency,
            operator: session.operator.name,
            balance: session.user.real_balance.toNumber(),
            playerId: session.user.external_player_id,
        });
    } catch {
        res.status(401).json({ error: 'Invalid session' });
    }
});

export default router;
