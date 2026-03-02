/**
 * Database Seed Script
 * 
 * Seeds the database with a default superadmin user.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create superadmin user
    const passwordHash = await bcrypt.hash('Admin@123', 12);

    const existingAdmin = await prisma.admin.findUnique({
        where: { username: 'admin' },
    });

    if (existingAdmin) {
        console.log('📝 Updating existing admin to superadmin role...');
        await prisma.admin.update({
            where: { username: 'admin' },
            data: {
                role: 'superadmin',
                passwordHash,
                isActive: true,
            },
        });
        console.log('✅ Admin user updated with superadmin role');
    } else {
        console.log('📝 Creating superadmin user...');
        await prisma.admin.create({
            data: {
                username: 'admin',
                passwordHash,
                role: 'superadmin',
                isActive: true,
            },
        });
        console.log('✅ Superadmin user created');
    }

    console.log('\n📊 Default Credentials:');
    console.log('   Username: admin');
    console.log('   Password: Admin@123');
    console.log('   Role: superadmin');
    console.log('\n🎉 Seeding completed!\n');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
