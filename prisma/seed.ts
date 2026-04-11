import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('Admin123!', 12)

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      username: 'admin',
      password_hash: passwordHash,
      status: 'active',
      role: 'admin',
    },
  })

  console.log('✅ Seed completado: admin@example.com / Admin123!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
