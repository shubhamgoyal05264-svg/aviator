import bcrypt from 'bcryptjs';
import { prisma } from '../src/prisma';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@skyhigh.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'skyhigh_admin';

async function main() {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const user = await prisma.user.upsert({
        where: { email: ADMIN_EMAIL },
        create: {
            username: ADMIN_USERNAME,
            email: ADMIN_EMAIL,
            password_hash: passwordHash,
            real_balance: 0,
            demo_balance: 0,
            kyc_status: 'VERIFIED',
            rounds_played: 0,
            is_admin: 1,
            banned: 0,
        },
        update: {
            password_hash: passwordHash,
            is_admin: 1,
            banned: 0,
        },
    });

    console.log('Admin user ready:');
    console.log(`  Email:    ${ADMIN_EMAIL}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);
    console.log(`  User ID:  ${user.id}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
