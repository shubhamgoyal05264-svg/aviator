# SkyHigh Crash Aviator: Production Architecture & Phase 1 Plan

## 1. Executive Gap Analysis

The current MVP demonstrates solid core mechanics (Provably Fair hashing, React integration, a basic game tick loop). However, to handle 5,000–10,000+ concurrent players for real money/crypto, several critical gaps exist in the current setup:

**What is Solid:**
*   **Cryptographic Soundness:** The [provablyFair.ts](file:///c:/Users/rishabh/Downloads/skyhigh-crash---provably-fair-aviator/server/src/provablyFair.ts) logic mapping server/client seeds + nonces to crash points is correct and must not be altered.
*   **Core Ticker Loop:** The [GameEngine](file:///c:/Users/rishabh/Downloads/skyhigh-crash---provably-fair-aviator/server/src/game.ts#41-274) class and exponent-based payout curve (`tickInterval` and `houseEdgeRate`) are solid foundational physics.
*   **WebSockets:** Socket.io is a fast and correct choice for real-time game sync.

**Technical Debt & High-Risk Areas:**
*   **State & Concurrency (Critical Risk):** Currently, `round` and `bets` state live purely in Node.js memory. If the Node binary crashes, all active round data and live bets disappear. Furthermore, this prevents running multiple Node servers, making horizontal scaling impossible.
*   **Database Bottleneck:** SQLite performs poorly under high concurrent writes. During the "Crashed" phase, looping through 5,000 users and executing separate `UPDATE users` or `UPDATE bets` transactions will lock the DB and drastically delay the next round start (causing "server lag").
*   **Payload Validation & Security (Critical Risk):** Missing strict schema validation on bet amounts and slots. Without strong sanitization, attackers could send negative bet amounts, extremely large floats (integer overflows), or malformed currencies.
*   **Lack of Caching/Queueing:** No rate limits or queueing on API or WebSockets, leaving the server vulnerable to DDoS and script-kiddie abuse.

---

## 2. Optimized 10-Week Production Roadmap

Assuming one full-time senior developer.

*   **Week 1: State & Schema Refactor (Phase 1)**
    *   Migrate SQLite to standard PostgreSQL using Prisma ORM.
    *   Write the Prisma schema, handle User/Bet balances, and implement transaction-safe DB writes for bet placements and cashouts.
*   **Week 2: Redis Integration & Docker (Phase 1)**
    *   Integrate Redis (`redis` client) for in-memory game state (`round` object) instead of Node memory.
    *   Integrate `@socket.io/redis-adapter` for horizontal WebSocket scaling.
    *   Set up Docker and `docker-compose.yml`.
*   **Week 3: Security & Validation Hardening (Phase 1)**
    *   Implement `Zod` validation on all API endpoints and WebSocket listeners.
    *   Set up express-rate-limit and JWT best practices.
*   **Week 4: Dual Betting Logic & Social (Phase 2)**
    *   Refactor frontend UI to allow "Bet A" and "Bet B" side-by-side.
    *   Implement Live Chat and a real-time "Live Bets Feed".
*   **Week 5: Economy & Risk Management Dashboard (Phase 4)**
    *   Expand Admin panel APIs to provide real-time metrics (GGR, NGR) and configure Honeymoon Logic modifiers dynamically.
*   **Week 6: Canvas / WebGL Engine Migration (Phase 3)**
    *   Migrate DOM-based frontend plane animation to PixiJS or HTML5 Canvas for butter-smooth 60 FPS graphics, adding particle tails and screen shake.
*   **Week 7: Sound Design & Polish (Phase 3)**
    *   Add responsive sound effects (dynamic pitch scaling, explosions, coin jingles).
*   **Week 8: Advanced Provably Fair Verifier UI (Phase 2 & 3)**
    *   Build a dedicated public React page where users enter unhashed seeds to mathematically verify any past round's crash point.
*   **Week 9: Load Testing & Security Audit (Phase 5)**
    *   Run `k6` distributed WebSocket load testing simulating 10,000 bots placing bets concurrently. Resolve discovered bottlenecks.
*   **Week 10: Staging & Production Deployment (Phase 5)**
    *   Set up AWS/GCP, configure Cloudflare proxy headers, implement HTTPS and wss:// secure routing, and Go-Live.

---

## 3. Phase 1 – Core Stabilization & Scalability (Implementation Plan)

### A. Full SQLite → PostgreSQL Migration (using Prisma)

We will use **Prisma ORM** for type-safe Postgres transactions. This inherently protects against SQL injection and provides robust database locking.

**1. Setup Prisma:**
```bash
npm install @prisma/client
npm install prisma --save-dev
npx prisma init
```

**2. `prisma/schema.prisma`**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  username      String   @unique
  password_hash String
  real_balance  Decimal  @default(0) @db.Decimal(20, 2)
  demo_balance  Decimal  @default(1000) @db.Decimal(20, 2)
  rounds_played Int      @default(0)
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  bets          Bet[]
}

model Round {
  id               String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  crash_point      Decimal  @db.Decimal(10, 2)
  server_seed      String
  server_seed_hash String
  client_seed      String
  nonce            Int
  started_at       DateTime @default(now())
  crashed_at       DateTime?
  
  bets             Bet[]
}

model Bet {
  id                 String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  round_id           String   @db.Uuid
  user_id            String   @db.Uuid
  slot               String   @db.VarChar(10) // e.g., "A" or "B" for dual-bet
  amount             Decimal  @db.Decimal(20, 2)
  currency           String   @db.VarChar(10) // "REAL" or "DEMO"
  auto_cashout       Decimal? @db.Decimal(10, 2)
  multiplier         Decimal? @db.Decimal(10, 2)
  cashout_amount     Decimal? @db.Decimal(20, 2)
  timestamp          DateTime @default(now())
  
  round              Round    @relation(fields: [round_id], references: [id])
  user               User     @relation(fields: [user_id], references: [id])

  @@unique([round_id, user_id, slot]) // Prevent duplicates per slot
}
```

**3. Transaction Strategy for Bet Placement ([game.ts](file:///c:/Users/rishabh/Downloads/skyhigh-crash---provably-fair-aviator/server/src/game.ts) refactor snippet):**
To avoid race conditions, we wrap bet placements in Prisma `$transaction`.
```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Inside GameEngine or Bet handler...
async function placeBet(userId: string, roundId: string, amount: number, currency: 'REAL' | 'DEMO', slot: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. Lock the user row for update
    const user = await tx.user.findUnique({ where: { id: userId }});
    if (!user) throw new Error('User not found');
    
    // 2. Validate balance
    const currentBalance = currency === 'REAL' ? user.real_balance.toNumber() : user.demo_balance.toNumber();
    if (currentBalance < amount) throw new Error('Insufficient funds');
    
    // 3. Deduct balance
    await tx.user.update({
      where: { id: userId },
      data: currency === 'REAL' ? { real_balance: { decrement: amount } } : { demo_balance: { decrement: amount } }
    });
    
    // 4. Create Bet
    return await tx.bet.create({
      data: { round_id: roundId, user_id: userId, amount, currency, slot }
    });
  });
}
```

### B. Redis Integration (Game State & Pub/Sub Horizontal Scaling)

Instead of relying on a single Socket server memory map, we must propagate events and maintain clustered game state via Redis.

**1. Install Dependencies:**
```bash
npm install redis ioredis @socket.io/redis-adapter
```

**2. Setup Socket.io Redis Adapter ([server/src/index.ts](file:///c:/Users/rishabh/Downloads/skyhigh-crash---provably-fair-aviator/server/src/index.ts) snippet):**
```typescript
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server } from 'socket.io';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  adapter: createAdapter(pubClient, subClient)
});
```
With the adapter configured, emitting `io.emit('round:tick', data)` from ANY node instance reaches ALL connected clients instantly. The [GameEngine](file:///c:/Users/rishabh/Downloads/skyhigh-crash---provably-fair-aviator/server/src/game.ts#41-274) should run a specialized "Master/Worker" logic where only ONE Node instance (the leader process) calculates the tick, while all other instances simply relay sockets to users.

### C. Security Hardening (Zod payload validation)

We must enforce that bet numbers are strictly positive, not larger than a sane limit, and strings are constrained.

**1. Define Schemas (`server/src/validators.ts`):**
```bash
npm install zod
```
```typescript
import { z } from 'zod';

export const PlaceBetSchema = z.object({
  slot: z.enum(['A', 'B']), // Only predefined slots for dual betting
  amount: z.number().positive().min(0.1).max(1000000), // Prevent negatives, overflows, tiny amounts
  currency: z.enum(['REAL', 'DEMO']),
  autoCashout: z.number().min(1.01).max(100000).optional()
});
```

**2. Protect Socket Handlers ([game.ts](file:///c:/Users/rishabh/Downloads/skyhigh-crash---provably-fair-aviator/server/src/game.ts) excerpt):**
```typescript
socket.on('bet:place', async (data) => {
    try {
        const validated = PlaceBetSchema.parse(data);
        // proceed with placeBet(userId, roundId, validated.amount, ...)...
    } catch (e) {
        socket.emit('error', { message: 'Invalid bet parameters', details: e.errors });
    }
});
```

### D. Docker & Docker-Compose Setup

Create `docker-compose.yml` in the root directory to spool up Postgres and Redis locally along with your development server.

```yaml
version: '3.8'

services:
  app:
    build: 
      context: ./server
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://crash_user:password123@postgres:5432/skyhigh_db?schema=public
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=development_secret_do_not_use_in_prod
    depends_on:
      - postgres
      - redis
    volumes:
      - ./server:/app
      - /app/node_modules

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: crash_user
      POSTGRES_PASSWORD: password123
      POSTGRES_DB: skyhigh_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

Create `server/Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

---

## 4. High-Level Plans for Phases 2–5

### Phase 2: Dual Betting & Social (Weeks 4 & 5)
*   **Expansion:** Update the Frontend to display two identical betting modules side-by-side. The state schema (`slot: z.enum(['A', 'B'])`) prepared in Phase 1 facilitates this cleanly without altering table architecture.
*   **Live Bets & Chat:** Add a `messages` table in DB. Listen to `socket.on('chat:msg')`. Rate limit users to 1 message / 2 seconds using Redis INCR logic.

### Phase 3: Canvas Engine & Sound Design (Weeks 6 & 7)
*   **PixiJS:** Remove DOM-based animations. Render the curve using `PIXI.Graphics().bezierCurveTo()` updated on every tick (`round:tick`).
*   **Sounds:** Utilize the Web Audio API. As the multiplier grows, calculate the pitch using `Math.log(multiplier)` to dynamically increase the engine whine of the airplane.

### Phase 4: Economy & Risk Management (Week 8)
*   **Admin Dashboard APIs:** Add highly aggregated DB queries to measure liquidity.
    ```sql
    -- Sample metric calculation
    SELECT date_trunc('hour', timestamp) as hour, 
           SUM(amount) as bet_volume, 
           SUM(COALESCE(cashout_amount, 0)) - SUM(amount) as house_profit 
    FROM "Bet" GROUP BY hour ORDER BY hour DESC LIMIT 24;
    ```
*   **Honeymoon Tuning:** Instead of hardcoded biases, load Honeymoon configuration rules dynamically from a Redis hash map during [tick()](file:///c:/Users/rishabh/Downloads/skyhigh-crash---provably-fair-aviator/server/src/game.ts#176-221) calculated against player win streaks. 

### Phase 5: QA, Security & Deployment (Weeks 9 & 10)
*   **Load Testing (K6.io):** Deploy a container cluster targeting standard AWS target groups. Verify 5,000 WebSocket opens/min.
*   **Provably Fair Verifier:** Implement a stateless, standalone client page exposing the specific hash functions (`crypto.pbkdf2Sync` or standard SHA256) running completely client-side. Code logic:
    ```javascript
    function verifyPastRound(serverSeed, clientSeed, nonce) {
       const hash = CryptoJS.HmacSHA256(clientSeed + ':' + nonce, serverSeed).toString(CryptoJS.enc.Hex);
       if (parseInt(hash.slice(0, 13), 16) % 33 === 0) return 1.00;
       // Standard generic implementation for comparison matching provablyFair.ts
    }
    ```

---

## 5. Cross-Cutting Production Essentials

### Environment Variables
A production `.env` must be segregated. Never commit this file.
```env
NODE_ENV=production
PORT=3000
DATABASE_URL="postgresql://user:pass@host:5432/db?pgbouncer=true"
REDIS_URL="redis://host:6379"
JWT_SECRET="<generate_secure_random_64_byte_string>"
CLIENT_URL="https://skyhighcrash.com"
ADMIN_URL="https://admin.skyhighcrash.com"
CORS_ORIGINS="https://skyhighcrash.com,https://admin.skyhighcrash.com"
```

### Logging & Error Tracking
*   **Winston / Pino:** Pino is recommended for JSON-formatted high-performance server logs. Avoid `console.log` in high concurrency loops as it is blocking.
*   **Sentry.io:** Attach the Sentry Express middleware to catch uncaught socket errors and Prisma exceptions.

### Architecture Diagram Details (Mermaid)

```mermaid
graph TD
    subgraph CDN & Security
        CF[Cloudflare WAF / Rate Limiter]
    end

    subgraph Client Applications
        C[Player React App - Canvas UI]
        A[Admin React App]
    end

    subgraph Load Balancer
        NGINX[Nginx Ingress / ALB]
    end

    subgraph Container Node.js Cluster
        N1[Node Server A - API & WS]
        N2[Node Server B - API & WS]
        N3[Node Server C - API & WS]
        GE[Leader Node - Game Ticker Loop]
    end

    subgraph In-Memory Cache & Pub/Sub
        REDIS[(Redis Cluster)]
    end

    subgraph Persistent Storage
        PG[(PostgreSQL Primary)]
        PGR[(PostgreSQL Read-Replica)]
    end

    C --> |WSS / HTTPS| CF
    CF --> NGINX
    NGINX --> N1
    NGINX --> N2
    NGINX --> N3
    
    A --> |HTTPS| CF
    
    N1 <--> REDIS
    N2 <--> REDIS
    N3 <--> REDIS
    GE <--> REDIS
    
    N1 --> PG
    N2 --> PG
    N3 --> PG
    GE --> PG
    
    PG --> PGR
```
