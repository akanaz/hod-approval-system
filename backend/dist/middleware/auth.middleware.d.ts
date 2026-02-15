import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                email: string;
                role: string;
            };
        }
    }
}
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const authorizeRoles: (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => Response | void;
//# sourceMappingURL=auth.middleware.d.ts.map