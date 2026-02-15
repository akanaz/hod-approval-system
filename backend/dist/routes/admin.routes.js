"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const admin_controller_1 = require("../controllers/admin.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
router.use(auth_middleware_1.authenticate);
router.use((0, auth_middleware_1.authorizeRoles)('ADMIN'));
router.get('/dashboard', admin_controller_1.getAdminDashboard);
router.get('/activity-logs', admin_controller_1.getActivityLogs);
router.get('/users', admin_controller_1.getAllUsers);
router.post('/users', admin_controller_1.createUser);
router.post('/create-user', admin_controller_1.createUser);
router.patch('/users/:id/toggle-status', admin_controller_1.toggleUserStatus);
router.delete('/users/:id', admin_controller_1.deleteUser);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map