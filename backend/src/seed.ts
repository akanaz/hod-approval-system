// backend/seed.ts

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User';
import EarlyDepartureRequest from './models/EarlyDepartureRequest';
import { AuditLog } from './models';

dotenv.config();

/* ================= DEPARTMENTS ================= */

const hodDepartments = [
  'Computer Science',
  'Artificial Intelligence & Machine Learning',
  'Data Science',
  'Information Technology',
  'Electronics & Communication',
  'Electrical Engineering',
];

const demoRegisterDepartments = [
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Biotechnology',
];

const allDepartments = [...hodDepartments, ...demoRegisterDepartments];

/* ================= DEPARTMENT CODE MAPPING ================= */

const deptCodes: Record<string, string> = {
  'Computer Science': 'cs',
  'Artificial Intelligence & Machine Learning': 'aiml',
  'Data Science': 'ds',
  'Information Technology': 'it',
  'Electronics & Communication': 'ec',
  'Electrical Engineering': 'ee',
  'Mechanical Engineering': 'me',
  'Civil Engineering': 'ce',
  'Chemical Engineering': 'che',
  'Biotechnology': 'bt'
};

/* ================= OTHER CONSTANTS ================= */

const reasons = [
  'Medical appointment',
  'Family emergency',
  'Personal work',
  'Health checkup',
  'Vehicle issue',
];

const urgencyLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const statuses = ['PENDING', 'APPROVED', 'REJECTED'] as const;

/* ================= SEED FUNCTION ================= */

async function seed() {
  try {
    const mongoURI =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/hod_approval_db';

    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    /* ================= CLEAR DATABASE ================= */

    await User.deleteMany({});
    await EarlyDepartureRequest.deleteMany({});
    await AuditLog.deleteMany({});
    console.log('🗑️ Cleared existing data');

    /* ================= CREATE ADMIN ================= */

    await User.create({
      email: 'admin@nmit.edu',
      password: 'admin123',
      firstName: 'System',
      lastName: 'Admin',
      employeeId: 'ADMIN001',
      department: 'Administration',
      role: 'ADMIN',
    });

    console.log('✅ Admin created');

    /* ================= CREATE HODs (6 departments) ================= */

    console.log('👔 Creating HODs...');
    const hods: any[] = [];

    for (let i = 0; i < hodDepartments.length; i++) {
      const dept = hodDepartments[i];
      const code = deptCodes[dept];

      const hod = await User.create({
        email: `${code}.hod@nmit.edu`,
        password: 'password123',
        firstName: 'HOD',
        lastName: dept.split(' ')[0],
        employeeId: `HOD${String(i + 1).padStart(3, '0')}`,
        department: dept,
        role: 'HOD',
      });

      hods.push(hod);
    }

    console.log(`✅ Created ${hods.length} HODs`);
    console.log('🧪 Remaining departments available for demo registration');

    /* ================= CREATE FACULTY (ALL departments) ================= */

    console.log('👨‍🏫 Creating faculty...');
    const facultyMembers: any[] = [];

    for (let i = 0; i < allDepartments.length; i++) {
      for (let j = 1; j <= 3; j++) {
        const dept = allDepartments[i];
        const code = deptCodes[dept];

        const faculty = await User.create({
          email: `${code}${j}.faculty@nmit.edu`,
          password: 'password123',
          firstName: 'Faculty',
          lastName: `${dept.split(' ')[0]}_${j}`,
          employeeId: `FAC${String(i * 3 + j).padStart(3, '0')}`,
          department: dept,
          role: 'FACULTY',
        });

        facultyMembers.push(faculty);
      }
    }

    console.log(`✅ Created ${facultyMembers.length} faculty`);

    /* ================= CREATE REQUESTS (only for depts with HOD) ================= */

    console.log('📝 Creating requests...');
    let requestCount = 0;

    for (let i = 0; i < 25; i++) {
      const faculty = facultyMembers[Math.floor(Math.random() * facultyMembers.length)];
      const hod = hods.find(h => h.department === faculty.department);

      if (!hod) continue;

      const status =
        i < 8 ? 'PENDING' : statuses[Math.floor(Math.random() * statuses.length)];

      const request = await EarlyDepartureRequest.create({
        facultyId: faculty._id,
        department: faculty.department,
        departureDate: new Date(Date.now() + 86400000),
        departureTime: '3:00 PM',
        expectedReturnTime: '5:00 PM',
        reason: reasons[Math.floor(Math.random() * reasons.length)],
        destination: 'City Hospital',
        urgencyLevel: urgencyLevels[Math.floor(Math.random() * urgencyLevels.length)],
        status,
        hodId: status === 'PENDING' ? undefined : hod._id,
      });

      await AuditLog.create({
        requestId: request._id,
        userId: faculty._id,
        action: 'created',
      });

      requestCount++;
    }

    console.log(`✅ Created ${requestCount} requests`);

    /* ================= SUMMARY ================= */

    console.log('\n🎉 DATABASE SEEDED SUCCESSFULLY');
    console.log('═══════════════════════════════════════');
    
    console.log('\n📊 STATISTICS');
    console.log('─────────────────────────────────────');
    console.log(`Total Departments: ${allDepartments.length}`);
    console.log(`Seeded HODs: ${hodDepartments.length}`);
    console.log(`Demo Register HODs: ${demoRegisterDepartments.length}`);
    console.log(`Total Faculty: ${facultyMembers.length}`);
    console.log(`Total Requests: ${requestCount}`);

    console.log('\n🔐 LOGIN CREDENTIALS');
    console.log('─────────────────────────────────────');
    console.log('ADMIN:');
    console.log('  Email: admin@nmit.edu');
    console.log('  Password: admin123');

    console.log('\nHODs (6 seeded):');
    hodDepartments.forEach(dept => {
      console.log(`  ${deptCodes[dept]}.hod@nmit.edu → ${dept}`);
    });
    console.log('  Password: password123');

    console.log('\nFACULTY (format: <code><number>.faculty@nmit.edu):');
    console.log('  Examples:');
    console.log('    cs1.faculty@nmit.edu → Computer Science Faculty 1');
    console.log('    aiml2.faculty@nmit.edu → AIML Faculty 2');
    console.log('    ds3.faculty@nmit.edu → Data Science Faculty 3');
    console.log('  Password: password123');

    console.log('\n📋 DEPARTMENT CODES');
    console.log('─────────────────────────────────────');
    Object.entries(deptCodes).forEach(([dept, code]) => {
      console.log(`  ${code.padEnd(6)} → ${dept}`);
    });

    console.log('\n═══════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
