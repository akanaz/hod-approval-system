"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
router.use(auth_middleware_1.authenticate);
router.get('/hod', (0, auth_middleware_1.authorizeRoles)('HOD', 'ADMIN'), dashboard_controller_1.getHODDashboard);
router.get('/faculty', (0, auth_middleware_1.authorizeRoles)('FACULTY'), dashboard_controller_1.getFacultyDashboard);
router.get('/department-stats', (0, auth_middleware_1.authorizeRoles)('HOD', 'ADMIN'), dashboard_controller_1.getDepartmentStats);
exports.default = router;
//# sourceMappingURL=dashboard.routes.js.map