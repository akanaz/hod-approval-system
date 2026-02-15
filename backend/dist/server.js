"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const database_1 = require("./config/database");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const request_routes_1 = __importDefault(require("./routes/request.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const delegation_routes_1 = __importDefault(require("./routes/delegation.routes"));
const dean_routes_1 = __importDefault(require("./routes/dean.routes"));
const errorHandler_1 = require("./middleware/errorHandler");
const notFound_1 = require("./middleware/notFound");
dotenv_1.default.config();
console.log("Loaded JWT:", process.env.JWT_SECRET);
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
if (!process.env.JWT_SECRET) {
    console.error('❌ FATAL: JWT_SECRET is required in environment variables');
    process.exit(1);
}
(0, database_1.connectDB)();
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, compression_1.default)());
if (process.env.NODE_ENV === 'development') {
    app.use((0, morgan_1.default)('dev'));
}
else {
    app.use((0, morgan_1.default)('combined'));
}
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
app.get('/health', (_req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        database: 'MongoDB',
        version: '2.0.0'
    });
});
app.use('/api/auth', auth_routes_1.default);
app.use('/api/requests', request_routes_1.default);
app.use('/api/users', user_routes_1.default);
app.use('/api/notifications', notification_routes_1.default);
app.use('/api/dashboard', dashboard_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/files', upload_routes_1.default);
app.use('/api/hod', delegation_routes_1.default);
app.use('/api/dean', dean_routes_1.default);
app.use(notFound_1.notFound);
app.use(errorHandler_1.errorHandler);
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    console.log(`💾 Database: MongoDB`);
    console.log(`✅ JWT Secret: Configured`);
    console.log(`📦 Version: 2.0.0`);
    console.log(`\n✨ NEW FEATURES:`);
    console.log(`   - Full-day leave support`);
    console.log(`   - HOD delegation system`);
    console.log(`   - Dean role for HOD approvals`);
    console.log(`   - Fixed file upload persistence`);
    console.log(`   - Enhanced security validation\n`);
});
exports.default = app;
//# sourceMappingURL=server.js.map