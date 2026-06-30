import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server as IOServer } from 'socket.io';
import { prisma } from './prisma';
import authRouter from './auth';
import walletRouter from './wallet';
import adminRouter from './admin';
import providerRouter from './provider/launch';
import { GameEngine } from './game';
import { corsMiddleware, corsOptions } from './cors';

async function main() {
    console.log('✅ DB Connected via Prisma');

    const app = express();
    const server = http.createServer(app);

    app.use(corsMiddleware);
    app.options('*', corsMiddleware);
    app.use(express.json());

    app.use('/api/auth', authRouter);
    app.use('/api/wallet', walletRouter);
    app.use('/api/admin', adminRouter);
    app.use('/api/provider', providerRouter);
    app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

    let ioOptions: ConstructorParameters<typeof IOServer>[1] = {
        cors: {
            origin: corsOptions.origin,
            methods: ['GET', 'POST'],
            credentials: true,
            allowedHeaders: corsOptions.allowedHeaders,
        },
    };

    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
        const { createClient } = require('redis');
        const { createAdapter } = require('@socket.io/redis-adapter');

        const pubClient = createClient({ url: redisUrl });
        const subClient = pubClient.duplicate();

        const onRedisError = (err: Error) => console.error('[Redis]', err.message);
        pubClient.on('error', onRedisError);
        subClient.on('error', onRedisError);

        try {
            await Promise.all([pubClient.connect(), subClient.connect()]);
            console.log('✅ Redis Connected');
            ioOptions = { ...ioOptions, adapter: createAdapter(pubClient, subClient) };
        } catch {
            await Promise.allSettled([pubClient.quit(), subClient.quit()]);
            console.warn('⚠️  Redis connection failed — using in-memory Socket.IO adapter (single-node only)');
        }
    } else {
        console.log('ℹ️  REDIS_URL not set — in-memory Socket.IO adapter (single-node)');
    }

    const io = new IOServer(server, ioOptions);

    const gameEngine = new GameEngine(io);

    io.on('connection', (socket) => {
        console.log(`[Socket] Connected: ${socket.id}`);
        gameEngine.handleConnection(socket);
        socket.on('disconnect', () => console.log(`[Socket] Disconnected: ${socket.id}`));
    });

    const PORT = parseInt(process.env.PORT || '3001', 10);
    server.listen(PORT, () => {
        console.log(`\n🚀 SkyHigh server → http://localhost:${PORT}`);
        console.log(`   REST API      → http://localhost:${PORT}/api`);
        console.log(`   Admin API     → http://localhost:${PORT}/api/admin`);
        console.log(`   WebSocket     → ws://localhost:${PORT}\n`);

        if (process.env.WORKER_MODE !== 'true') {
            console.log('👑 Running as Game Master Node (Ticker Active)');
            gameEngine.start();
        } else {
            console.log('👷 Running as Socket Worker Node (Ticker Inactive)');
        }
    });
}

main().catch(err => {
    console.error('Server startup failed:', err);
    process.exit(1);
});
