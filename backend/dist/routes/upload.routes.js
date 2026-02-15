"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
const uploadDir = path_1.default.join(__dirname, '../../uploads/requests');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `doc-${uniqueSuffix}${ext}`);
    }
});
const fileFilter = (_req, file, cb) => {
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
    }
    else {
        cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPG, PNG allowed'), false);
    }
};
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});
router.post('/upload', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRoles)('FACULTY', 'HOD'), upload.array('files', 3), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            res.status(400).json({ message: 'No files uploaded' });
            return;
        }
        const files = req.files;
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
    }
    catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: error.message || 'Upload failed' });
    }
});
router.delete('/delete/:filename', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const { filename } = req.params;
        const filenameRegex = /^doc-\d+-\d+\.(pdf|docx?|jpe?g|png)$/i;
        if (!filenameRegex.test(filename)) {
            res.status(400).json({ message: 'Invalid filename format' });
            return;
        }
        const filePath = path_1.default.join(uploadDir, filename);
        const resolvedPath = path_1.default.resolve(filePath);
        const resolvedUploadDir = path_1.default.resolve(uploadDir);
        if (!resolvedPath.startsWith(resolvedUploadDir)) {
            res.status(400).json({ message: 'Invalid file path' });
            return;
        }
        if (filename.includes('/') || filename.includes('\\')) {
            res.status(400).json({ message: 'Invalid filename - no path separators allowed' });
            return;
        }
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
            res.json({ message: 'File deleted successfully' });
        }
        else {
            res.status(404).json({ message: 'File not found' });
        }
    }
    catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ message: 'Failed to delete file' });
    }
});
exports.default = router;
//# sourceMappingURL=upload.routes.js.map