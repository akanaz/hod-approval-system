"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dean_controller_1 = require("../controllers/dean.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
router.use(auth_middleware_1.authenticate);
router.use((0, auth_middleware_1.authorizeRoles)('DEAN'));
router.get('/dashboard', dean_controller_1.getDeanDashboard);
router.get('/hod-requests', dean_controller_1.getHODRequests);
router.get('/hods', dean_controller_1.getAllHODs);
exports.default = router;
//# sourceMappingURL=dean.routes.js.map