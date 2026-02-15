// backend/seed.ts
// ✅ UPDATED: Added DEAN role, delegation fields, leaveType, request editing/cancellation

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
  'Medical appointment at Apollo Hospital',
  'Family emergency - urgent matter',
  'Personal work - bank related',
  'Annual health checkup scheduled',
  'Vehicle breakdown - emergency repair needed',
  'Legal consultation appointment',
  'Child school emergency',
  'Elderly parent care',
];

const urgencyLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const statuses = ['PENDING', 'APPROVED', 'REJECTED'] as const;
const leaveTypes = ['PARTIAL', 'FULL_DAY'] as const;

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
    console.log('🗑️  Cleared existing data');

    /* ================= CREATE ADMIN ================= */

    await User.create({
      email: 'admin@nmit.edu',
      password: 'admin123',
      firstName: 'System',
      lastName: 'Admin',
      employeeId: 'ADMIN001',
      department: 'Administration',
      role: 'ADMIN',
      phoneNumber: '+91-9876543210',
    });

    console.log('✅ Admin created');

    /* ================= CREATE DEAN ================= */

    const dean = await User.create({
      email: 'dean@nmit.edu',
      password: 'dean123',
      firstName: 'Academic',
      lastName: 'Dean',
      employeeId: 'DEAN001',
      department: 'Administration',
      role: 'DEAN',
      phoneNumber: '+91-9876543211',
    });

    console.log('✅ Dean created');

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
        phoneNumber: `+91-98765432${20 + i}`,
      });

      hods.push(hod);
    }

    console.log(`✅ Created ${hods.length} HODs`);

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
          phoneNumber: `+91-98765433${String(i * 3 + j).padStart(2, '0')}`,
        });

        facultyMembers.push(faculty);
      }
    }

    console.log(`✅ Created ${facultyMembers.length} faculty`);

    /* ================= CREATE DELEGATION EXAMPLE ================= */

    // Delegate HOD rights from CS HOD to CS Faculty 1 for next 7 days
    const csHod = hods.find(h => h.department === 'Computer Science');
    const csFaculty1 = facultyMembers.find(
      f => f.email === 'cs1.faculty@nmit.edu'
    );

    if (csHod && csFaculty1) {
      const now = new Date();
      const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      csFaculty1.delegatedBy = csHod._id;
      csFaculty1.delegationStartDate = now;
      csFaculty1.delegationEndDate = endDate;
      csFaculty1.delegationPermissions = [
        'approve_requests',
        'reject_requests',
        'request_more_info',
      ];
      await csFaculty1.save();

      console.log('✅ Delegation example created (CS HOD → CS Faculty 1)');
    }

    /* ================= CREATE REQUESTS ================= */

    console.log('📝 Creating requests...');
    let requestCount = 0;

    // Get only faculty from departments that have HODs
    const facultyWithHods = facultyMembers.filter(f =>
      hodDepartments.includes(f.department)
    );

    for (let i = 0; i < 40; i++) {
      const faculty =
        facultyWithHods[Math.floor(Math.random() * facultyWithHods.length)];
      const hod = hods.find(h => h.department === faculty.department);

      if (!hod) continue;

      const status =
        i < 12
          ? 'PENDING'
          : statuses[Math.floor(Math.random() * statuses.length)];

      const leaveType =
        leaveTypes[Math.floor(Math.random() * leaveTypes.length)];

      // Random date in next 30 days
      const daysAhead = Math.floor(Math.random() * 30) + 1;
      const departureDate = new Date();
      departureDate.setDate(departureDate.getDate() + daysAhead);

      const request = await EarlyDepartureRequest.create({
        facultyId: faculty._id,
        leaveType,
        departureDate,
        departureTime: leaveType === 'PARTIAL' ? '2:00 PM' : undefined,
        expectedReturnTime: leaveType === 'PARTIAL' ? '5:00 PM' : undefined,
        reason: reasons[Math.floor(Math.random() * reasons.length)],
        destination: leaveType === 'FULL_DAY' ? 'Personal' : 'City Hospital',
        urgencyLevel:
          urgencyLevels[Math.floor(Math.random() * urgencyLevels.length)],
        status,
        hodId: status === 'PENDING' ? undefined : hod._id,
        approvedBy: status === 'APPROVED' ? hod._id : undefined,
        approvedByRole: status === 'APPROVED' ? 'HOD' : undefined,
        approvedAt: status === 'APPROVED' ? new Date() : undefined,
        rejectedAt: status === 'REJECTED' ? new Date() : undefined,
        rejectionReason:
          status === 'REJECTED'
            ? 'Insufficient notice period'
            : undefined,
        attachments: [], // Empty for seed data
      });

      await AuditLog.create({
        requestId: request._id,
        userId: faculty._id,
        action: 'created',
        details: {
          urgencyLevel: request.urgencyLevel,
          leaveType: request.leaveType,
        },
      });

      requestCount++;
    }

    /* ================= CREATE HOD REQUESTS (for Dean) ================= */

    console.log('📝 Creating HOD requests...');
    let hodRequestCount = 0;

    for (let i = 0; i < 5; i++) {
      const hod = hods[Math.floor(Math.random() * hods.length)];
      const status = i < 2 ? 'PENDING' : statuses[Math.floor(Math.random() * statuses.length)];
      const leaveType = leaveTypes[Math.floor(Math.random() * leaveTypes.length)];

      const daysAhead = Math.floor(Math.random() * 20) + 1;
      const departureDate = new Date();
      departureDate.setDate(departureDate.getDate() + daysAhead);

      const hodRequest = await EarlyDepartureRequest.create({
        facultyId: hod._id, // HOD is the requester
        leaveType,
        departureDate,
        departureTime: leaveType === 'PARTIAL' ? '1:00 PM' : undefined,
        expectedReturnTime: leaveType === 'PARTIAL' ? '4:00 PM' : undefined,
        reason: 'Conference attendance / Administrative work',
        destination: 'Conference Hall / Admin Office',
        urgencyLevel: urgencyLevels[Math.floor(Math.random() * urgencyLevels.length)],
        status,
        hodId: status === 'PENDING' ? undefined : dean._id,
        approvedBy: status === 'APPROVED' ? dean._id : undefined,
        approvedByRole: status === 'APPROVED' ? 'DEAN' : undefined,
        approvedAt: status === 'APPROVED' ? new Date() : undefined,
        rejectedAt: status === 'REJECTED' ? new Date() : undefined,
        attachments: [],
      });

      await AuditLog.create({
        requestId: hodRequest._id,
        userId: hod._id,
        action: 'created',
        details: {
          urgencyLevel: hodRequest.urgencyLevel,
          leaveType: hodRequest.leaveType,
          requestedBy: 'HOD',
        },
      });

      hodRequestCount++;
    }

    console.log(`✅ Created ${requestCount} faculty requests`);
    console.log(`✅ Created ${hodRequestCount} HOD requests`);

    /* ================= SUMMARY ================= */

    console.log('\n🎉 DATABASE SEEDED SUCCESSFULLY');
    console.log('╔═══════════════════════════════════════╗');
    console.log('║   HOD APPROVAL SYSTEM v2.0           ║');
    console.log('╚═══════════════════════════════════════╝');

    console.log('\n📊 STATISTICS');
    console.log('─────────────────────────────────────────');
    console.log(`Total Departments: ${allDepartments.length}`);
    console.log(`Seeded HODs: ${hodDepartments.length}`);
    console.log(`Demo Register Departments: ${demoRegisterDepartments.length}`);
    console.log(`Total Faculty: ${facultyMembers.length}`);
    console.log(`Faculty Requests: ${requestCount}`);
    console.log(`HOD Requests: ${hodRequestCount}`);
    console.log(`Total Requests: ${requestCount + hodRequestCount}`);

    console.log('\n🔐 LOGIN CREDENTIALS');
    console.log('─────────────────────────────────────────');

    console.log('\n🔧 ADMIN:');
    console.log('  Email: admin@nmit.edu');
    console.log('  Password: admin123');
    console.log('  Role: System Administrator');

    console.log('\n👨‍💼 DEAN:');
    console.log('  Email: dean@nmit.edu');
    console.log('  Password: dean123');
    console.log('  Role: Academic Dean (Approves HOD requests)');

    console.log('\n👔 HODs (6 seeded departments):');
    hodDepartments.forEach((dept, idx) => {
      console.log(`  ${(idx + 1)}. ${deptCodes[dept].padEnd(6)}.hod@nmit.edu → ${dept}`);
    });
    console.log('  Password: password123');

    console.log('\n👨‍🏫 FACULTY (format: <code><number>.faculty@nmit.edu):');
    console.log('  Examples:');
    console.log('    cs1.faculty@nmit.edu    → Computer Science Faculty 1');
    console.log('    aiml2.faculty@nmit.edu  → AIML Faculty 2');
    console.log('    ds3.faculty@nmit.edu    → Data Science Faculty 3');
    console.log('  Password: password123');

    console.log('\n✨ SPECIAL FEATURES DEMO');
    console.log('─────────────────────────────────────────');
    console.log('🔄 DELEGATION EXAMPLE:');
    console.log('  CS HOD has delegated rights to cs1.faculty@nmit.edu');
    console.log('  cs1.faculty@nmit.edu can approve CS department requests');
    console.log('  Duration: 7 days from seed time');
    console.log('  Permissions: Approve, Reject, Request More Info');

    console.log('\n📋 DEPARTMENT CODES');
    console.log('─────────────────────────────────────────');
    Object.entries(deptCodes).forEach(([dept, code]) => {
      const hasHod = hodDepartments.includes(dept) ? '✅' : '🔓';
      console.log(`  ${hasHod} ${code.padEnd(6)} → ${dept}`);
    });
    console.log('\n  ✅ = HOD seeded (ready to use)');
    console.log('  🔓 = Available for demo registration');

    console.log('\n🎯 QUICK START GUIDE');
    console.log('─────────────────────────────────────────');
    console.log('1. Login as FACULTY (cs1.faculty@nmit.edu)');
    console.log('2. Create leave request (partial or full-day)');
    console.log('3. Upload supporting documents');
    console.log('4. Login as HOD (cs.hod@nmit.edu)');
    console.log('5. Approve/Reject faculty requests');
    console.log('6. Delegate rights to cs1.faculty@nmit.edu');
    console.log('7. Login as DEAN (dean@nmit.edu)');
    console.log('8. Approve HOD leave requests');

    console.log('\n📌 NEW FEATURES IN v2.0');
    console.log('─────────────────────────────────────────');
    console.log('✅ Full-Day Leave Support');
    console.log('✅ HOD Delegation System');
    console.log('✅ DEAN Role for HOD Approvals');
    console.log('✅ Request Editing (Pending only)');
    console.log('✅ Request Cancellation');
    console.log('✅ File Upload with Attachments');
    console.log('✅ Approval Tracking (HOD/Delegated/DEAN)');

    console.log('\n╔═══════════════════════════════════════╗');
    console.log('║  🚀 Ready to start development!      ║');
    console.log('╚═══════════════════════════════════════╝\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
