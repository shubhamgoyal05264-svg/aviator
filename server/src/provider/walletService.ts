import { prisma } from '../prisma';
import { walletClient } from './walletClient';

interface WalletUser {
    id: string;
    operator_id: string | null;
    external_player_id: string | null;
}

interface DebitCtx { roundId: string; txId: string; currency: string; }
interface CreditCtx { roundId: string; txId: string; refTxId: string; currency: string; }

export const isProviderUser = (u: WalletUser) => !!u.operator_id && !!u.external_player_id;

async function loadOperator(operatorId: string) {
    const op = await prisma.operator.findUnique({ where: { id: operatorId } });
    if (!op || op.active === 0) throw new Error('Operator inactive');
    return { id: op.id, secret_key: op.secret_key, callback_url: op.callback_url };
}

/**
 * Take a stake from the player.
 * - Internal players: atomic decrement of the local wallet.
 * - Operator players: call the operator seamless `/bet` endpoint (authoritative),
 *   then mirror the returned balance locally for display.
 */
export async function debit(user: WalletUser, amount: number, ctx: DebitCtx): Promise<{ balance: number }> {
    if (isProviderUser(user)) {
        const operator = await loadOperator(user.operator_id!);
        const result = await walletClient.bet(operator, {
            playerId: user.external_player_id!,
            currency: ctx.currency,
            amount,
            roundId: ctx.roundId,
            txId: ctx.txId,
        });
        await prisma.user.update({ where: { id: user.id }, data: { real_balance: result.balance } });
        return { balance: result.balance };
    }

    const updated = await prisma.$transaction(async (tx: any) => {
        const u = await tx.user.findUnique({ where: { id: user.id } });
        if (!u) throw new Error('User not found');
        if (u.real_balance.toNumber() < amount) throw new Error('Insufficient balance');
        return tx.user.update({ where: { id: user.id }, data: { real_balance: { decrement: amount } } });
    });
    return { balance: updated.real_balance.toNumber() };
}

/**
 * Pay a win to the player.
 * - Internal players: atomic increment of the local wallet.
 * - Operator players: call the operator seamless `/win` endpoint.
 */
export async function credit(user: WalletUser, amount: number, ctx: CreditCtx): Promise<{ balance: number }> {
    if (isProviderUser(user)) {
        const operator = await loadOperator(user.operator_id!);
        const result = await walletClient.win(operator, {
            playerId: user.external_player_id!,
            currency: ctx.currency,
            amount,
            roundId: ctx.roundId,
            txId: ctx.txId,
            refTxId: ctx.refTxId,
        });
        await prisma.user.update({ where: { id: user.id }, data: { real_balance: result.balance } });
        return { balance: result.balance };
    }

    const updated = await prisma.user.update({
        where: { id: user.id },
        data: { real_balance: { increment: amount } },
    });
    return { balance: updated.real_balance.toNumber() };
}

/** Refund a stake when settlement fails after a successful debit. */
export async function rollback(user: WalletUser, amount: number, ctx: { roundId: string; refTxId: string; currency: string }): Promise<void> {
    if (isProviderUser(user)) {
        try {
            const operator = await loadOperator(user.operator_id!);
            const result = await walletClient.rollback(operator, {
                playerId: user.external_player_id!,
                currency: ctx.currency,
                roundId: ctx.roundId,
                refTxId: ctx.refTxId,
            });
            await prisma.user.update({ where: { id: user.id }, data: { real_balance: result.balance } });
        } catch (e) {
            console.error('[wallet] rollback failed:', e);
        }
        return;
    }
    await prisma.user.update({ where: { id: user.id }, data: { real_balance: { increment: amount } } });
}
