const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function main() {
  const phone = process.argv[2] || '13800138000';
  const password = process.argv[3] || 'Test123456';
  const name = process.argv[4] || '测试用户';

  const existing = await prisma.users.findUnique({ where: { phone } });
  if (existing) {
    console.log(`用户 ${phone} 已存在，ID: ${existing.id}`);
    await prisma.$disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.users.create({
    data: {
      id: uuidv4(),
      name,
      phone,
      password_hash: passwordHash,
      status: true,
    },
  });

  console.log(`用户创建成功: ${user.id}, 手机号: ${user.phone}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
