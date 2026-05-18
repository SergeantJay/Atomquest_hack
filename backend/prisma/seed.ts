import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Hash passwords
  const adminPass = await bcrypt.hash('Admin@123', 12);
  const managerPass = await bcrypt.hash('Manager@123', 12);
  const empPass = await bcrypt.hash('Emp@123', 12);

  // Create Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@company.com',
      password: adminPass,
      role: 'ADMIN',
      department: 'Administration',
    },
  });
  console.log('Created admin:', admin.email);

  // Create Manager
  const manager = await prisma.user.upsert({
    where: { email: 'manager@company.com' },
    update: {},
    create: {
      name: 'Alice Manager',
      email: 'manager@company.com',
      password: managerPass,
      role: 'MANAGER',
      department: 'Engineering',
    },
  });
  console.log('Created manager:', manager.email);

  // Create Employees
  const emp1 = await prisma.user.upsert({
    where: { email: 'emp1@company.com' },
    update: {},
    create: {
      name: 'Bob Employee',
      email: 'emp1@company.com',
      password: empPass,
      role: 'EMPLOYEE',
      department: 'Engineering',
      managerId: manager.id,
    },
  });

  const emp2 = await prisma.user.upsert({
    where: { email: 'emp2@company.com' },
    update: {},
    create: {
      name: 'Carol Employee',
      email: 'emp2@company.com',
      password: empPass,
      role: 'EMPLOYEE',
      department: 'Engineering',
      managerId: manager.id,
    },
  });

  const emp3 = await prisma.user.upsert({
    where: { email: 'emp3@company.com' },
    update: {},
    create: {
      name: 'Dave Employee',
      email: 'emp3@company.com',
      password: empPass,
      role: 'EMPLOYEE',
      department: 'Engineering',
      managerId: manager.id,
    },
  });
  console.log('Created employees:', emp1.email, emp2.email, emp3.email);

  // Create Thrust Areas
  const thrustAreas = [
    { name: 'Sales & Revenue', description: 'Revenue generation, sales targets, and business growth' },
    { name: 'Operational Excellence', description: 'Process efficiency, quality, and delivery excellence' },
    { name: 'Customer Experience', description: 'Customer satisfaction, NPS, and service quality' },
    { name: 'People & Culture', description: 'Talent development, engagement, and organizational culture' },
    { name: 'Innovation', description: 'New products, process improvements, and R&D initiatives' },
  ];

  const createdAreas: Array<{ id: string; name: string }> = [];
  for (const area of thrustAreas) {
    const existing = await prisma.thrustArea.findFirst({ where: { name: area.name } });
    if (!existing) {
      const created = await prisma.thrustArea.create({ data: area });
      createdAreas.push(created);
    } else {
      createdAreas.push(existing);
    }
  }
  console.log('Created thrust areas:', createdAreas.map(a => a.name).join(', '));

  // Create Active Goal Cycle for 2026
  const existingCycle = await prisma.goalCycle.findFirst({ where: { name: 'FY 2026 - Goal Setting' } });
  let cycle;
  if (!existingCycle) {
    cycle = await prisma.goalCycle.create({
      data: {
        name: 'FY 2026 - Goal Setting',
        year: 2026,
        phase: 'GOAL_SETTING',
        windowOpens: new Date('2026-01-01T00:00:00Z'),
        windowCloses: new Date('2026-12-31T23:59:59Z'),
        isActive: true,
      },
    });
  } else {
    cycle = existingCycle;
  }
  console.log('Created goal cycle:', cycle.name);

  // Create Escalation Rules
  const escalationRules = [
    {
      triggerType: 'GOAL_NOT_SUBMITTED',
      daysThreshold: 7,
      isActive: true,
    },
    {
      triggerType: 'GOAL_NOT_APPROVED',
      daysThreshold: 5,
      isActive: true,
    },
    {
      triggerType: 'CHECKIN_NOT_DONE',
      daysThreshold: 14,
      isActive: true,
    },
  ];

  for (const rule of escalationRules) {
    const existing = await prisma.escalationRule.findFirst({
      where: { triggerType: rule.triggerType },
    });
    if (!existing) {
      await prisma.escalationRule.create({ data: rule });
    }
  }
  console.log('Created escalation rules');

  // Create sample goal sheet for emp1 to demonstrate the system
  const existingSheet = await prisma.goalSheet.findFirst({
    where: { employeeId: emp1.id, cycleId: cycle.id },
  });

  if (!existingSheet && createdAreas.length > 0) {
    const sheet = await prisma.goalSheet.create({
      data: {
        employeeId: emp1.id,
        cycleId: cycle.id,
        status: 'DRAFT',
      },
    });

    // Add sample goals
    await prisma.goal.createMany({
      data: [
        {
          goalSheetId: sheet.id,
          thrustAreaId: createdAreas[0].id,
          title: 'Increase quarterly sales by 20%',
          description: 'Focus on new customer acquisition and upselling to existing clients',
          uomType: 'MIN',
          target: 120,
          weightage: 30,
        },
        {
          goalSheetId: sheet.id,
          thrustAreaId: createdAreas[1].id,
          title: 'Reduce deployment time to under 30 minutes',
          description: 'Optimize CI/CD pipeline and deployment automation',
          uomType: 'MAX',
          target: 30,
          weightage: 25,
        },
        {
          goalSheetId: sheet.id,
          thrustAreaId: createdAreas[2].id,
          title: 'Achieve NPS score of 8.5+',
          description: 'Improve customer feedback mechanisms and response times',
          uomType: 'MIN',
          target: 8.5,
          weightage: 20,
        },
        {
          goalSheetId: sheet.id,
          thrustAreaId: createdAreas[3].id,
          title: 'Complete leadership training program',
          description: 'Enroll and complete the Q2 leadership development program',
          uomType: 'TIMELINE',
          target: 1,
          targetDate: new Date('2026-06-30T23:59:59Z'),
          weightage: 15,
        },
        {
          goalSheetId: sheet.id,
          thrustAreaId: createdAreas[4].id,
          title: 'Launch new product feature',
          description: 'Deliver the AI-powered dashboard feature by Q3',
          uomType: 'TIMELINE',
          target: 1,
          targetDate: new Date('2026-09-30T23:59:59Z'),
          weightage: 10,
        },
      ],
    });
    console.log('Created sample goal sheet for emp1 with 5 goals');
  }

  console.log('\nSeed completed successfully!');
  console.log('\nTest Credentials:');
  console.log('  Admin:   admin@company.com   / Admin@123');
  console.log('  Manager: manager@company.com / Manager@123');
  console.log('  Emp 1:   emp1@company.com    / Emp@123');
  console.log('  Emp 2:   emp2@company.com    / Emp@123');
  console.log('  Emp 3:   emp3@company.com    / Emp@123');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
