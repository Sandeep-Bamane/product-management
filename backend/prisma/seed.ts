import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
  if (!existing) {
    const hash = await bcrypt.hash('admin123', 12);
    await prisma.user.create({ data: { email: 'admin@example.com', password: hash } });
    console.log('Seeded admin user: admin@example.com / admin123');
  } else {
    console.log('Admin user already exists, skipping.');
  }

  const categories = ['Electronics', 'Clothing', 'Books'];
  for (const name of categories) {
    const existingCat = await prisma.category.findFirst({ where: { name } });
    if (!existingCat) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const suffix = Array.from({ length: 6 }, () =>
        chars[Math.floor(Math.random() * chars.length)],
      ).join('');
      await prisma.category.create({ data: { uniqueId: `CAT-${suffix}`, name } });
      console.log(`Seeded category: ${name}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
