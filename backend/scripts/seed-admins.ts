/**
 * Seed des comptes administrateurs
 * Idempotent : utilise upsert, sans risque si exécuté plusieurs fois.
 *
 * Usage :
 *   npx ts-node scripts/seed-admins.ts
 *   node dist/scripts/seed-admins.js  (après build)
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface AdminSeed {
  email: string;
  password: string;
}

const admins: AdminSeed[] = [
  { email: 'amir@gmail.com',   password: 'H@ck2007ir' },
  { email: 'frejus@gmail.com', password: 'DlnH@ck2007' },
];

async function seedAdmins(): Promise<void> {
  console.log('👤 [Seed] Initialisation des comptes admin...');

  for (const adminData of admins) {
    const passwordHash = await bcrypt.hash(adminData.password, 12);

    const admin = await prisma.admin.upsert({
      where:  { email: adminData.email },
      update: { passwordHash },           // met à jour le hash si déjà existant
      create: {
        email:        adminData.email,
        passwordHash,
      },
    });

    console.log(`✅ [Seed] Admin prêt : ${admin.email} (id: ${admin.id})`);
  }

  console.log('✅ [Seed] Tous les admins sont initialisés.');
}

seedAdmins()
  .catch((err) => {
    console.error('❌ [Seed] Erreur lors du seed des admins :', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
