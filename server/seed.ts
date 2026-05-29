import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const passwordHash = await bcrypt.hash('admin123', 10);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@skyhigh.com' },
        update: {
            is_admin: 1,
            password_hash: passwordHash
        },
        create: {
            username: 'admin',
            email: 'admin@skyhigh.com',
            password_hash: passwordHash,
            real_balance: 1000000,
            demo_balance: 5000,
            kyc_status: 'VERIFIED',
            rounds_played: 0,
            is_admin: 1,
        }
    });

    console.log('✅ Admin user ensured:', admin.username);
    console.log('📧 Email: admin@skyhigh.com');
    console.log('🔑 Password: admin123');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
