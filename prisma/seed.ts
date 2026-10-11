import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PASSWORD = 'Admin@123456';
const hash = bcrypt.hashSync(PASSWORD, 10);

async function main() {
  console.log('🌱 Starting seed...');

  // ── Super Admin (no org) ──
  const saUser = await prisma.user.upsert({
    where: { email: 'superadmin@test.com' },
    update: {},
    create: {
      email: 'superadmin@test.com',
      passwordHash: hash,
      profile: {
        create: {
          userType: 'staff',
          role: 'super_admin',
          firstName: 'سوپر',
          lastName: 'ادمین',
          phone: '09120000000',
          active: true,
        },
      },
    },
    include: { profile: true },
  });

  console.log('  ✅ Super Admin:', saUser.email);
  console.log('🌱 Seed complete!');

  console.log('\n📋 Login credentials:');
  console.log('  Super Admin:  superadmin@test.com / Admin@123456');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });