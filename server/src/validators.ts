import { z } from 'zod';

export const PlaceBetSchema = z.object({
    slot: z.enum(['A', 'B']),
    amount: z.number().positive().min(0.1).max(1000000),
    currency: z.enum(['REAL', 'DEMO']),
    autoCashout: z.number().min(1.01).max(100000).optional()
});
