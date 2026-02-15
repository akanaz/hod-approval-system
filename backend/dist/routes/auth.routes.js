"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
router.post('/login', auth_controller_1.login);
router.post('/register', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRoles)('ADMIN'), auth_controller_1.register);
router.get('/me', auth_middleware_1.authenticate, auth_controller_1.getProfile);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map