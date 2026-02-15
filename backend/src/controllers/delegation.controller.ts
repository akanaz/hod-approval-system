// backend/src/controllers/delegation.controller.ts
// ✅ FIXED: Shows ALL delegations with detailed logging

import { Request, Response } from 'express';
import User from '../models/User';
import { AuditLog } from '../models';

/* ===============================================
   GET ELIGIBLE FACULTY FOR DELEGATION
=============================================== */
export const getEligibleFaculty = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'HOD') {
      res.status(403).json({ message: 'Only HODs can view eligible faculty' });
      return;
    }

    const hod = await User.findById(req.user.userId);
    if (!hod) {
      res.status(404).json({ message: 'HOD not found' });
      return;
    }

    console.log(`🔍 HOD ${hod.email} checking eligible faculty in department: ${hod.department}`);

    // Find faculty in same department who don't have active delegation
    const eligibleFaculty = await User.find({
      department: hod.department,
      role: 'FACULTY',
      isActive: true,
      $or: [
        { delegatedBy: null },
        { delegatedBy: { $exists: false } },
        { delegationEndDate: { $lt: new Date() } }
      ]
    })
    .select('firstName lastName email employeeId phoneNumber')
    .lean();

    console.log(`✅ Found ${eligibleFaculty.length} eligible faculty members`);

    const faculty = eligibleFaculty.map(f => ({
      id: f._id.toString(),
      _id: f._id.toString(),
      firstName: f.firstName,
      lastName: f.lastName,
      email: f.email,
      employeeId: f.employeeId,
      phoneNumber: f.phoneNumber,
      department: hod.department
    }));

    res.json({ faculty });
    return;
  } catch (error) {
    console.error('Get eligible faculty error:', error);
    res.status(500).json({ message: 'Server error' });
    return;
  }
};

export const getMyDelegations = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'HOD') {
      res.status(403).json({ message: 'Only HODs can view delegations' });
      return;
    }

    console.log(`🔍 Fetching delegations for HOD: ${req.user.userId}`);

    // ✅ FIXED: Get ALL delegations (no date filter)
    const delegatedFaculty = await User.find({
      delegatedBy: req.user.userId,
      delegationEndDate: { $exists: true }  // ← Just check field exists
    })
    .select('firstName lastName email employeeId delegationStartDate delegationEndDate delegationPermissions')
    .lean();

    console.log(`📊 Found ${delegatedFaculty.length} total delegations`);

    // ✅ Calculate isActive in JavaScript (more reliable)
    const now = new Date();
    const delegations = delegatedFaculty.map(f => {
      const endDate = f.delegationEndDate ? new Date(f.delegationEndDate) : null;
      const isActive = endDate ? endDate >= now : false;

      console.log(`  - ${f.email}: endDate=${endDate?.toISOString()}, isActive=${isActive}`);

      return {
        id: f._id.toString(),
        _id: f._id.toString(),
        facultyId: {
          _id: f._id.toString(),
          id: f._id.toString(),
          firstName: f.firstName,
          lastName: f.lastName,
          email: f.email,
          employeeId: f.employeeId
        },
        startDate: f.delegationStartDate,
        endDate: f.delegationEndDate,
        permissions: f.delegationPermissions || [],
        isActive: isActive
      };
    });

    console.log(`✅ Returning ${delegations.length} delegations`);

    res.json({ delegations });
    return;
  } catch (error) {
    console.error('❌ Get delegations error:', error);
    res.status(500).json({ message: 'Server error' });
    return;
  }
};
/* ===============================================
   DELEGATE RIGHTS TO FACULTY
=============================================== */
export const delegateRights = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'HOD') {
      res.status(403).json({ message: 'Only HODs can delegate rights' });
      return;
    }

    const { facultyId, startDate, endDate, permissions } = req.body;

    console.log(`🔍 Delegation request:`, {
      hodId: req.user.userId,
      facultyId,
      startDate,
      endDate,
      permissions
    });

    if (!facultyId || !startDate || !endDate || !permissions || permissions.length === 0) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      res.status(400).json({ message: 'End date must be after start date' });
      return;
    }

    const hod = await User.findById(req.user.userId);
    if (!hod) {
      res.status(404).json({ message: 'HOD not found' });
      return;
    }

    const faculty = await User.findById(facultyId);
    if (!faculty) {
      res.status(404).json({ message: 'Faculty not found' });
      return;
    }

    if (faculty.department !== hod.department) {
      res.status(400).json({ message: 'Can only delegate to faculty in your department' });
      return;
    }

    if (faculty.role !== 'FACULTY') {
      res.status(400).json({ message: 'Can only delegate to users with FACULTY role' });
      return;
    }

    // Check if faculty has ACTIVE delegation
    if (faculty.delegatedBy && faculty.delegationEndDate && faculty.delegationEndDate >= new Date()) {
      res.status(400).json({ 
        message: `${faculty.firstName} ${faculty.lastName} already has active delegated rights` 
      });
      return;
    }

    console.log(`✅ Granting delegation to ${faculty.email}`);

    // Grant delegation
    faculty.delegatedBy = hod._id;
    faculty.delegationStartDate = start;
    faculty.delegationEndDate = end;
    faculty.delegationPermissions = permissions;
    await faculty.save();

    console.log(`✅ Delegation saved successfully`);

    // Create audit log
    try {
      await AuditLog.create({
        requestId: faculty._id,
        userId: req.user.userId,
        action: 'delegation_granted',
        details: {
          delegatedTo: facultyId,
          delegatedToName: `${faculty.firstName} ${faculty.lastName}`,
          startDate,
          endDate,
          permissions
        }
      });
    } catch (auditError) {
      console.error('Audit log error:', auditError);
    }

    res.json({
      message: 'Rights delegated successfully',
      delegation: {
        id: faculty._id.toString(),
        facultyId: {
          _id: faculty._id.toString(),
          firstName: faculty.firstName,
          lastName: faculty.lastName,
          email: faculty.email
        },
        startDate: faculty.delegationStartDate,
        endDate: faculty.delegationEndDate,
        permissions: faculty.delegationPermissions
      }
    });
    return;
  } catch (error) {
    console.error('❌ Delegate rights error:', error);
    res.status(500).json({ message: 'Server error' });
    return;
  }
};

/* ===============================================
   REVOKE DELEGATION
=============================================== */
export const revokeDelegation = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'HOD') {
      res.status(403).json({ message: 'Only HODs can revoke delegation' });
      return;
    }

    const { facultyId } = req.params;

    console.log(`🔍 Revoke request: HOD ${req.user.userId} → Faculty ${facultyId}`);

    const faculty = await User.findById(facultyId);
    if (!faculty) {
      res.status(404).json({ message: 'Faculty not found' });
      return;
    }

    // Verify HOD is the one who delegated
    if (!faculty.delegatedBy || faculty.delegatedBy.toString() !== req.user.userId) {
      console.log(`❌ Delegation mismatch:`, {
        facultyDelegatedBy: faculty.delegatedBy?.toString(),
        requestingHOD: req.user.userId
      });
      res.status(403).json({ message: 'Can only revoke delegation you granted' });
      return;
    }

    console.log(`✅ Revoking delegation for: ${faculty.email}`);

    // Revoke delegation
    await User.findByIdAndUpdate(facultyId, {
      $unset: { 
        delegatedBy: 1,
        delegationStartDate: 1,
        delegationEndDate: 1
      },
      $set: {
        delegationPermissions: []
      }
    });

    console.log(`✅ Delegation revoked successfully`);

    // Create audit log
    try {
      await AuditLog.create({
        requestId: faculty._id,
        userId: req.user.userId,
        action: 'delegation_revoked',
        details: {
          revokedFrom: facultyId,
          facultyName: `${faculty.firstName} ${faculty.lastName}`
        }
      });
    } catch (auditError) {
      console.error('Audit log error:', auditError);
    }

    res.json({ message: 'Delegation revoked successfully' });
    return;
  } catch (error) {
    console.error('❌ Revoke delegation error:', error);
    res.status(500).json({ message: 'Server error' });
    return;
  }
};

/* ===============================================
   EXTEND DELEGATION
=============================================== */
export const extendDelegation = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'HOD') {
      res.status(403).json({ message: 'Only HODs can extend delegation' });
      return;
    }

    const { facultyId } = req.params;
    const { newEndDate } = req.body;

    if (!newEndDate) {
      res.status(400).json({ message: 'New end date required' });
      return;
    }

    const faculty = await User.findById(facultyId);
    if (!faculty) {
      res.status(404).json({ message: 'Faculty not found' });
      return;
    }

    if (faculty.delegatedBy?.toString() !== req.user.userId) {
      res.status(403).json({ message: 'Can only extend delegation you granted' });
      return;
    }

    const newEnd = new Date(newEndDate);
    const currentEnd = faculty.delegationEndDate;

    if (!currentEnd) {
      res.status(400).json({ message: 'No active delegation to extend' });
      return;
    }

    if (newEnd <= currentEnd) {
      res.status(400).json({ message: 'New end date must be after current end date' });
      return;
    }

    const previousEndDate = faculty.delegationEndDate;
    faculty.delegationEndDate = newEnd;
    await faculty.save();

    console.log(`✅ Extended delegation for ${faculty.email} until ${newEnd.toISOString()}`);

    // Create audit log
    try {
      await AuditLog.create({
        requestId: faculty._id,
        userId: req.user.userId,
        action: 'delegation_extended',
        details: {
          facultyId,
          facultyName: `${faculty.firstName} ${faculty.lastName}`,
          previousEndDate,
          newEndDate
        }
      });
    } catch (auditError) {
      console.error('Audit log error:', auditError);
    }

    res.json({
      message: 'Delegation extended successfully',
      delegation: {
        previousEndDate,
        newEndDate: faculty.delegationEndDate
      }
    });
    return;
  } catch (error) {
    console.error('❌ Extend delegation error:', error);
    res.status(500).json({ message: 'Server error' });
    return;
  }
};