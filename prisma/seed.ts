import { PrismaClient } from '../src/generated/prisma'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@nsbcoach.com' },
    update: {},
    create: {
      name: 'Coach Admin',
      email: 'admin@nsbcoach.com',
      passwordHash: hashedPassword,
      role: 'ADMIN',
    },
  })
  console.log(`Created admin user: ${admin.email}`)

  // Create default app settings
  const settings = [
    { key: 'default_quiz_format', value: 'QA' },
    { key: 'quiz_timer_enabled', value: 'false' },
    { key: 'quiz_timer_seconds', value: '30' },
    { key: 'default_quiz_length', value: '15' },
  ]

  for (const setting of settings) {
    const result = await prisma.appSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    })
    console.log(`Created setting: ${result.key} = ${result.value}`)
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
