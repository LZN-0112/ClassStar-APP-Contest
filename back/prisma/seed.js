const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const ADMIN_ID = '11111111-1111-1111-1111-111111111111';
const STUDENT_ID = '22222222-2222-2222-2222-222222222222';
const TEACHER_ID = '44444444-4444-4444-4444-444444444444';
const CLASS_ID = '33333333-3333-3333-3333-333333333333';
const MEMBER_ID = '55555555-5555-5555-5555-555555555555';
const MSG_ID = '66666666-6666-6666-6666-666666666666';
const ATD_ID = '77777777-7777-7777-7777-777777777777';
const HW_ID = '88888888-8888-8888-8888-888888888888';
const LA_ID = '99999999-9999-9999-9999-999999999999';

const passwordHash = bcrypt.hashSync('test1234', 10);

async function main() {
  // 1. 用户
  await prisma.users.createMany({
    data: [
      { id: ADMIN_ID, name: '系统管理员', phone: '13800138000', student_id: 'A0001', password_hash: passwordHash, status: true },
      { id: STUDENT_ID, name: '张三', phone: '13800138001', student_id: '2023001', password_hash: passwordHash, status: true },
      { id: TEACHER_ID, name: '王老师', phone: '13800138003', student_id: 'T0001', password_hash: passwordHash, status: true },
    ],
    skipDuplicates: true,
  });

  // 2. 班级
  await prisma.classes.createMany({
    data: [
      { id: CLASS_ID, name: '软件工程 2023 级 1 班', code: 'SW2023001', creator_id: ADMIN_ID, announcement: '欢迎使用班级事务助手', status: true },
    ],
    skipDuplicates: true,
  });

  // 3. 班级成员
  await prisma.class_members.createMany({
    data: [
      { id: MEMBER_ID, class_id: CLASS_ID, user_id: STUDENT_ID, role: '学生', is_committee: false },
    ],
    skipDuplicates: true,
  });

  // 4. 通知 messages
  await prisma.messages.createMany({
    data: [
      { id: MSG_ID, class_id: CLASS_ID, publisher_id: TEACHER_ID, type: 'important', title: '欢迎使用班级事务助手', content: '本系统用于班级通知、作业、签到、请假等事务管理。', require_ack: false, status: 'published' },
    ],
    skipDuplicates: true,
  });

  // 5. 签到 attendances
  const now = new Date();
  await prisma.attendances.createMany({
    data: [
      {
        id: ATD_ID,
        class_id: CLASS_ID,
        publisher_id: TEACHER_ID,
        title: '数据结构课堂签到',
        type: 'normal',
        start_time: new Date(now.getTime() - 60 * 60 * 1000),
        end_time: new Date(now.getTime() + 60 * 60 * 1000),
        method: 'qr',
        location: 'A101 教室',
        status: 'open',
      },
    ],
    skipDuplicates: true,
  });

  // 6. 作业 homeworks
  await prisma.homeworks.createMany({
    data: [
      { id: HW_ID, class_id: CLASS_ID, publisher_id: TEACHER_ID, title: '数据结构第一次作业', subject: '数据结构', content: '完成教材第 1-3 章课后习题。', deadline: new Date('2026-07-20T23:59:59'), status: 'published' },
    ],
    skipDuplicates: true,
  });

  // 7. 请假 leave_applications
  await prisma.leave_applications.createMany({
    data: [
      { id: LA_ID, attendance_id: ATD_ID, student_id: STUDENT_ID, reason: '身体不适，需要去医院就诊。', status: 'pending' },
    ],
    skipDuplicates: true,
  });

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
