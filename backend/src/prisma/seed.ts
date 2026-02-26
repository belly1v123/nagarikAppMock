/**
 * Database Seed Script
 * 
 * Seeds the database with initial data for development/testing.
 * 
 * Run with: npm run seed
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { hashValue, hashApiKey, normalizePhoneNumber, normalizeCitizenshipNumber } from '../utils/hash';
import { encrypt } from '../utils/encryption';
import { generateRandomDescriptor } from '../utils/faceDistance';

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════
// SEED DATA
// ═══════════════════════════════════════════════════════════════

const adminData = {
    username: 'admin',
    password: 'Admin@123',
    role: 'superadmin',
};

const apiKeyData = {
    name: 'Nepal Voting Platform',
    key: 'nag_live_demo_votingplatform_key_001',
    permissions: {
        verify_identity: true,
        check_liveness: true,
        check_duplicate: true,
        check_status: true,
    },
    rateLimit: 1000,
};

// Mock citizen data
// NOTE: Face descriptors in seed data are random numbers.
// In real usage, descriptors are extracted by face-api.js
// from actual face images during registration.
// Replace these with real descriptors for testing face matching.
const citizensData = [
    {
        fullName: 'Hari Prasad Sharma',
        citizenshipNumber: '01-01-123456',
        dateOfBirth: '1985-03-15',
        gender: 'male',
        district: 'Kathmandu',
        municipality: 'Kathmandu Metropolitan City',
        wardNumber: '10',
        phoneNumber: '+9779801234567',
        email: 'hari.sharma@example.com',
        isVoterEligible: true,
    },
    {
        fullName: 'Sita Kumari Devi',
        citizenshipNumber: '02-03-654321',
        dateOfBirth: '1992-07-22',
        gender: 'female',
        district: 'Lalitpur',
        municipality: 'Lalitpur Metropolitan City',
        wardNumber: '5',
        phoneNumber: '+9779812345678',
        email: 'sita.devi@example.com',
        isVoterEligible: true,
    },
    {
        fullName: 'Ram Bahadur Thapa',
        citizenshipNumber: '03-05-789012',
        dateOfBirth: '1978-11-30',
        gender: 'male',
        district: 'Bhaktapur',
        municipality: 'Bhaktapur Municipality',
        wardNumber: '3',
        phoneNumber: '+9779823456789',
        isVoterEligible: true,
    },
    {
        fullName: 'Anita Gurung',
        citizenshipNumber: '04-07-345678',
        dateOfBirth: '2008-01-10', // under 18 - not eligible
        gender: 'female',
        district: 'Kaski',
        municipality: 'Pokhara Metropolitan City',
        wardNumber: '15',
        phoneNumber: '+9779834567890',
        isVoterEligible: false,
        eligibilityReason: 'Age below 18',
    },
    {
        fullName: 'Bikash Raj Rai',
        citizenshipNumber: '05-09-901234',
        dateOfBirth: '1990-05-20',
        gender: 'male',
        district: 'Morang',
        municipality: 'Biratnagar Metropolitan City',
        wardNumber: '8',
        phoneNumber: '+9779845678901',
        email: 'bikash.rai@example.com',
        isVoterEligible: true,
    },
];

// ═══════════════════════════════════════════════════════════════
// SEED FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function seedAdmin(): Promise<void> {
    console.log('🔐 Creating admin user...');

    const passwordHash = await bcrypt.hash(adminData.password, 12);

    await prisma.admin.upsert({
        where: { username: adminData.username },
        update: { passwordHash, role: adminData.role },
        create: {
            username: adminData.username,
            passwordHash,
            role: adminData.role,
            isActive: true,
        },
    });

    console.log(`   ✓ Admin created: ${adminData.username} / ${adminData.password}`);
}

async function seedApiKey(): Promise<void> {
    console.log('🔑 Creating API key...');

    const keyHash = hashApiKey(apiKeyData.key);
    const keyPrefix = apiKeyData.key.substring(0, 12) + '...';

    await prisma.apiKey.upsert({
        where: { keyHash },
        update: {
            name: apiKeyData.name,
            permissions: apiKeyData.permissions,
            rateLimit: apiKeyData.rateLimit,
        },
        create: {
            name: apiKeyData.name,
            keyHash,
            keyPrefix,
            permissions: apiKeyData.permissions,
            rateLimit: apiKeyData.rateLimit,
            isActive: true,
        },
    });

    console.log(`   ✓ API key created: ${apiKeyData.name}`);
    console.log(`   ✓ Full key: ${apiKeyData.key}`);
}

async function seedCitizens(): Promise<void> {
    console.log('👥 Creating mock citizens...');

    for (const citizen of citizensData) {
        const normalizedCitizenship = normalizeCitizenshipNumber(citizen.citizenshipNumber);
        const normalizedPhone = normalizePhoneNumber(citizen.phoneNumber);

        const citizenshipHash = hashValue(normalizedCitizenship);
        const phoneHash = hashValue(normalizedPhone);

        // Check if already exists
        const existing = await prisma.citizenRecord.findFirst({
            where: { citizenshipHash },
        });

        if (existing) {
            console.log(`   - Skipping ${citizen.fullName} (already exists)`);
            continue;
        }

        // Generate random face descriptors for testing
        // TODO: Replace with real face descriptors for face matching tests
        const faceDescriptors = {
            front: generateRandomDescriptor(),
            left: generateRandomDescriptor(),
            right: generateRandomDescriptor(),
        };

        await prisma.citizenRecord.create({
            data: {
                fullName: encrypt(citizen.fullName),
                citizenshipNumber: encrypt(normalizedCitizenship),
                citizenshipHash,
                dateOfBirth: encrypt(citizen.dateOfBirth),
                gender: citizen.gender,
                district: citizen.district,
                municipality: citizen.municipality,
                wardNumber: citizen.wardNumber,
                phoneNumber: encrypt(normalizedPhone),
                phoneHash,
                email: citizen.email,
                faceDescriptorFront: faceDescriptors.front,
                faceDescriptorLeft: faceDescriptors.left,
                faceDescriptorRight: faceDescriptors.right,
                isVoterEligible: citizen.isVoterEligible,
                eligibilityReason: citizen.eligibilityReason,
                isActive: true,
                isFlagged: false,
            },
        });

        console.log(`   ✓ Created: ${citizen.fullName} (${citizen.district})`);
    }
}

async function seedAuditLog(): Promise<void> {
    console.log('📋 Creating audit log entries...');

    // Create a few sample audit logs
    await prisma.auditLog.createMany({
        data: [
            {
                action: 'register',
                details: { source: 'seed_script', environment: 'development' },
            },
            {
                action: 'api_key_created',
                performedBy: 'system',
                details: { keyName: apiKeyData.name },
            },
        ],
    });

    console.log('   ✓ Audit logs created');
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main(): Promise<void> {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║          🇳🇵 NAGARIK MOCK — Database Seeder                    ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    try {
        await seedAdmin();
        await seedApiKey();
        await seedCitizens();
        await seedAuditLog();

        console.log('\n✅ Database seeding completed successfully!\n');
        console.log('Login credentials:');
        console.log(`  Admin: ${adminData.username} / ${adminData.password}`);
        console.log(`  API Key: ${apiKeyData.key}\n`);
    } catch (error) {
        console.error('\n❌ Seeding failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
