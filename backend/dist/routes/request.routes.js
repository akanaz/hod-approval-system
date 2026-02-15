"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const request_controller_1 = require("../controllers/request.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRoles)('FACULTY', 'HOD'), request_controller_1.createRequest);
router.patch('/:id/edit', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRoles)('FACULTY', 'HOD'), request_controller_1.editRequest);
router.post('/:id/cancel', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRoles)('FACULTY', 'HOD'), request_controller_1.cancelRequest);
router.get('/', auth_middleware_1.authenticate, request_controller_1.getRequests);
router.get('/:id', auth_middleware_1.authenticate, request_controller_1.getRequestById);
router.post('/:id/comments', auth_middleware_1.authenticate, request_controller_1.addComment);
router.post('/:id/approve', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRoles)('HOD', 'DEAN', 'FACULTY'), request_controller_1.approveRequest);
router.patch('/:id/approve', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRoles)('HOD', 'DEAN', 'FACULTY'), request_controller_1.approveRequest);
router.post('/:id/reject', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRoles)('HOD', 'DEAN', 'FACULTY'), request_controller_1.rejectRequest);
router.patch('/:id/reject', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRoles)('HOD', 'DEAN', 'FACULTY'), request_controller_1.rejectRequest);
router.post('/:id/request-more-info', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRoles)('HOD', 'DEAN', 'ADMIN', 'FACULTY'), request_controller_1.requestMoreInfo);
router.patch('/:id/request-more-info', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRoles)('HOD', 'DEAN', 'ADMIN', 'FACULTY'), request_controller_1.requestMoreInfo);
exports.default = router;
//# sourceMappingURL=request.routes.js.map