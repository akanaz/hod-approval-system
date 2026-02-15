export declare const verifyEmailConfig: () => void;
export declare const sendEmail: (to: string, subject: string, html: string) => Promise<void>;
export declare const sendNewRequestEmail: (hodEmail: string, hodName: string, facultyName: string, facultyEmail: string, department: string, departureDate: string, departureTime: string, urgencyLevel: string, reason: string) => Promise<void>;
export declare const sendApprovedEmail: (facultyEmail: string, facultyName: string, exitPassNumber: string, departureDate: string, departureTime: string, hodComments: string, qrCodeDataUrl: string) => Promise<void>;
export declare const sendRejectedEmail: (facultyEmail: string, facultyName: string, departureDate: string, departureTime: string, rejectionReason: string, hodComments: string) => Promise<void>;
//# sourceMappingURL=email.d.ts.map