import { Request, Response } from 'express';
export declare const createRequest: (req: Request, res: Response) => Promise<void>;
export declare const editRequest: (req: Request, res: Response) => Promise<void>;
export declare const cancelRequest: (req: Request, res: Response) => Promise<void>;
export declare const getRequests: (req: Request, res: Response) => Promise<void>;
export declare const getRequestById: (req: Request, res: Response) => Promise<void>;
export declare const approveRequest: (req: Request, res: Response) => Promise<void>;
export declare const rejectRequest: (req: Request, res: Response) => Promise<void>;
export declare const requestMoreInfo: (req: Request, res: Response) => Promise<void>;
export declare const addComment: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=request.controller.d.ts.map