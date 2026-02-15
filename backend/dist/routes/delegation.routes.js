"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const delegation_controller_1 = require("../controllers/delegation.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
router.use(auth_middleware_1.authenticate);
router.use((0, auth_middleware_1.authorizeRoles)('HOD'));
router.get('/department-faculty', delegation_controller_1.getEligibleFaculty);
router.get('/delegations', delegation_controller_1.getMyDelegations);
router.post('/delegate', delegation_controller_1.delegateRights);
router.delete('/delegations/:facultyId', delegation_controller_1.revokeDelegation);
router.patch('/extend/:facultyId', delegation_controller_1.extendDelegation);
exports.default = router;
//# sourceMappingURL=delegation.routes.js.map