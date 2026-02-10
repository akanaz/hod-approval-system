// backend/src/routes/upload.routes.ts
// FILE UPLOAD ROUTES

import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../../uploads/requests');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `doc-${uniqueSuffix}${ext}`);
  }
});

// File filter - only allow specific types
const fileFilter = (_req: any, file: any, cb: any) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Invalid file type. Only PDF, DOC, DOCX, JPG, PNG allowed'
      ),
      false
    );
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Upload endpoint
router.post(
  '/upload',
  authenticate,
  authorizeRoles('FACULTY'),
  upload.array('files', 3), // Max 3 files
  async (req: Request, res: Response) => {
    try {
      if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
        res.status(400).json({ message: 'No files uploaded' });
        return;
      }

      const files = req.files as Express.Multer.File[];

      const fileData = files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        path: `/uploads/requests/${file.filename}`,
        mimetype: file.mimetype,
        size: file.size,
        uploadedAt: new Date()
      }));

      res.json({
        message: 'Files uploaded successfully',
        files: fileData
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      res.status(500).json({ message: error.message || 'Upload failed' });
    }
  }
);

// Delete file endpoint
router.delete(
  '/delete/:filename',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(uploadDir, filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.json({ message: 'File deleted successfully' });
      } else {
        res.status(404).json({ message: 'File not found' });
      }
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({ message: 'Failed to delete file' });
    }
  }
);

export default router;
