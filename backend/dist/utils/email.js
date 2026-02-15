"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendRejectedEmail = exports.sendApprovedEmail = exports.sendNewRequestEmail = exports.sendEmail = exports.verifyEmailConfig = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
function getTransporter() {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!user || !pass)
        return null;
    return nodemailer_1.default.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
    });
}
const verifyEmailConfig = () => {
    const t = getTransporter();
    if (!t) {
        console.warn('⚠️  Email disabled: SMTP_USER or SMTP_PASS not set in .env');
        return;
    }
    t.verify((err) => {
        if (err) {
            console.error('❌ Email SMTP error:', err.message);
        }
        else {
            console.log('✅ Email ready — sending from:', process.env.SMTP_USER);
        }
    });
};
exports.verifyEmailConfig = verifyEmailConfig;
const sendEmail = async (to, subject, html) => {
    const t = getTransporter();
    if (!t) {
        console.warn(`⚠️  Email skipped (not configured) → ${to}`);
        return;
    }
    try {
        const info = await t.sendMail({
            from: `HOD Approval System <${process.env.SMTP_USER}>`,
            to,
            subject,
            html,
        });
        console.log(`✅ Email sent → ${to} [${info.messageId}]`);
    }
    catch (err) {
        console.error(`❌ Email failed → ${to}: ${err.message}`);
    }
};
exports.sendEmail = sendEmail;
const sendEmailWithInlineImage = async (to, subject, html, imageDataUrl, imageCid) => {
    const t = getTransporter();
    if (!t) {
        console.warn(`⚠️  Email skipped (not configured) → ${to}`);
        return;
    }
    const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
    try {
        const info = await t.sendMail({
            from: `HOD Approval System <${process.env.SMTP_USER}>`,
            to,
            subject,
            html,
            attachments: [
                {
                    filename: 'exitpass-qrcode.png',
                    content: base64Data,
                    encoding: 'base64',
                    cid: imageCid,
                },
            ],
        });
        console.log(`✅ Email sent (QR inline) → ${to} [${info.messageId}]`);
    }
    catch (err) {
        console.error(`❌ Email failed → ${to}: ${err.message}`);
    }
};
const sendNewRequestEmail = async (hodEmail, hodName, facultyName, facultyEmail, department, departureDate, departureTime, urgencyLevel, reason) => {
    const colors = {
        CRITICAL: '#dc2626',
        HIGH: '#ea580c',
        MEDIUM: '#f59e0b',
        LOW: '#10b981',
    };
    const badgeColor = colors[urgencyLevel] || '#6b7280';
    const dashboardUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;background:#f1f5f9;margin:0;padding:0}
  .wrap{max-width:580px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden}
  .hdr{background:linear-gradient(135deg,#2563eb,#4f46e5);padding:28px 24px;text-align:center}
  .hdr h1{color:#fff;margin:8px 0 0;font-size:20px}
  .hdr p{color:#bfdbfe;margin:4px 0 0;font-size:13px}
  .body{padding:24px}
  .card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0}
  .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:13px}
  .row:last-child{border-bottom:none}
  .lbl{font-weight:600;color:#64748b}
  .val{color:#1e293b}
  .badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:700;color:#fff;background:${badgeColor}}
  .reason-box{background:#eff6ff;border-left:3px solid #2563eb;padding:12px;border-radius:6px;font-size:13px;margin-top:12px}
  .btn{display:inline-block;margin-top:20px;padding:11px 22px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px}
  .ftr{text-align:center;padding:16px;color:#94a3b8;font-size:11px;border-top:1px solid #e2e8f0}
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    <div style="font-size:32px">&#128276;</div>
    <h1>New Early Departure Request</h1>
    <p>Requires your review and action</p>
  </div>
  <div class="body">
    <p style="margin-bottom:12px;font-size:15px">Dear <strong>${hodName}</strong>,</p>
    <p style="font-size:13px;color:#475569"><strong>${facultyName}</strong> (${department}) has submitted an early departure request.</p>
    <div class="card">
      <div class="row"><span class="lbl">Faculty</span><span class="val">${facultyName}</span></div>
      <div class="row"><span class="lbl">Faculty Email</span><span class="val">${facultyEmail}</span></div>
      <div class="row"><span class="lbl">Department</span><span class="val">${department}</span></div>
      <div class="row"><span class="lbl">Date</span><span class="val">${departureDate}</span></div>
      <div class="row"><span class="lbl">Time</span><span class="val">${departureTime}</span></div>
      <div class="row">
        <span class="lbl">Urgency</span>
        <span class="val"><span class="badge">${urgencyLevel}</span></span>
      </div>
      <div class="reason-box"><strong>Reason:</strong> ${reason}</div>
    </div>
    <a href="${dashboardUrl}" class="btn">Open HOD Dashboard &#8594;</a>
  </div>
  <div class="ftr">HOD Approval System &bull; NMIT &bull; Automated Notification</div>
</div>
</body></html>`;
    await (0, exports.sendEmail)(hodEmail, `New Request - ${facultyName} [${urgencyLevel}] ${departureDate}`, html);
};
exports.sendNewRequestEmail = sendNewRequestEmail;
const sendApprovedEmail = async (facultyEmail, facultyName, exitPassNumber, departureDate, departureTime, hodComments, qrCodeDataUrl) => {
    const dashboardUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const QR_CID = 'exitpassqr';
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;background:#f1f5f9;margin:0;padding:0}
  .wrap{max-width:580px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden}
  .hdr{background:linear-gradient(135deg,#059669,#10b981);padding:28px 24px;text-align:center}
  .hdr h1{color:#fff;margin:8px 0 0;font-size:20px}
  .hdr p{color:#a7f3d0;margin:4px 0 0;font-size:13px}
  .body{padding:24px}
  .pass-box{background:linear-gradient(135deg,#059669,#10b981);border-radius:10px;padding:18px;text-align:center;color:#fff;margin:16px 0}
  .pass-num{font-size:26px;font-weight:800;letter-spacing:3px;margin:6px 0;font-family:monospace}
  .card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0}
  .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:13px}
  .row:last-child{border-bottom:none}
  .lbl{font-weight:600;color:#64748b}
  .val{color:#1e293b}
  .qr-box{text-align:center;border:2px solid #d1fae5;border-radius:12px;padding:20px;margin:20px 0;background:#f0fdf4}
  .comments{background:#ecfdf5;border-left:3px solid #10b981;padding:12px;border-radius:6px;font-size:13px;margin-top:10px}
  .btn{display:inline-block;margin-top:20px;padding:11px 22px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px}
  .ftr{text-align:center;padding:16px;color:#94a3b8;font-size:11px;border-top:1px solid #e2e8f0}
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    <div style="font-size:32px">&#9989;</div>
    <h1>Request Approved!</h1>
    <p>Your early departure has been confirmed</p>
  </div>
  <div class="body">
    <p style="margin-bottom:12px;font-size:15px">Dear <strong>${facultyName}</strong>,</p>
    <p style="font-size:13px;color:#475569">Your request has been <strong style="color:#059669">APPROVED</strong> by your HOD.</p>

    <div class="pass-box">
      <div style="font-size:12px;opacity:.9">Exit Pass Number</div>
      <div class="pass-num">${exitPassNumber}</div>
      <div style="font-size:11px;opacity:.8">Show this when leaving campus</div>
    </div>

    <div class="card">
      <div class="row"><span class="lbl">Departure Date</span><span class="val">${departureDate}</span></div>
      <div class="row"><span class="lbl">Departure Time</span><span class="val">${departureTime}</span></div>
      <div class="row"><span class="lbl">Exit Pass</span><span class="val"><strong>${exitPassNumber}</strong></span></div>
      ${hodComments && hodComments !== 'None'
        ? `<div class="comments"><strong>HOD Comments:</strong> ${hodComments}</div>`
        : ''}
    </div>

    <div class="qr-box">
      <p style="font-size:14px;font-weight:600;color:#065f46;margin:0 0 14px">
        &#128241; Your Exit Pass QR Code
      </p>
      <!--
        IMPORTANT: src="cid:exitpassqr" — NOT a data: URI.
        The actual PNG is attached as an inline attachment with cid=exitpassqr.
        This is the only way to show images in Gmail without being blocked.
      -->
      <img
        src="cid:${QR_CID}"
        alt="Exit Pass QR Code"
        width="200"
        height="200"
        style="display:block;margin:0 auto;border-radius:8px;border:1px solid #bbf7d0"
      />
      <p style="font-size:11px;color:#64748b;margin:12px 0 0">Scan to verify your exit pass details</p>
    </div>

    <a href="${dashboardUrl}" class="btn">View in Dashboard &#8594;</a>
  </div>
  <div class="ftr">HOD Approval System &bull; NMIT &bull; Automated Notification</div>
</div>
</body></html>`;
    await sendEmailWithInlineImage(facultyEmail, `Approved - Exit Pass ${exitPassNumber} | ${departureDate}`, html, qrCodeDataUrl, QR_CID);
};
exports.sendApprovedEmail = sendApprovedEmail;
const sendRejectedEmail = async (facultyEmail, facultyName, departureDate, departureTime, rejectionReason, hodComments) => {
    const dashboardUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;background:#f1f5f9;margin:0;padding:0}
  .wrap{max-width:580px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden}
  .hdr{background:linear-gradient(135deg,#dc2626,#ef4444);padding:28px 24px;text-align:center}
  .hdr h1{color:#fff;margin:8px 0 0;font-size:20px}
  .hdr p{color:#fecaca;margin:4px 0 0;font-size:13px}
  .body{padding:24px}
  .card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0}
  .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:13px}
  .row:last-child{border-bottom:none}
  .lbl{font-weight:600;color:#64748b}
  .val{color:#1e293b}
  .rejection{background:#fef2f2;border-left:3px solid #ef4444;padding:12px;border-radius:6px;font-size:13px;margin-top:10px;color:#991b1b}
  .comments{background:#f8fafc;border-left:3px solid #94a3b8;padding:12px;border-radius:6px;font-size:13px;margin-top:8px;color:#475569}
  .btn{display:inline-block;margin-top:20px;padding:11px 22px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px}
  .ftr{text-align:center;padding:16px;color:#94a3b8;font-size:11px;border-top:1px solid #e2e8f0}
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    <div style="font-size:32px">&#10060;</div>
    <h1>Request Not Approved</h1>
    <p>Your request was rejected by HOD</p>
  </div>
  <div class="body">
    <p style="margin-bottom:12px;font-size:15px">Dear <strong>${facultyName}</strong>,</p>
    <p style="font-size:13px;color:#475569">Your request has been <strong style="color:#dc2626">REJECTED</strong> by your HOD.</p>
    <div class="card">
      <div class="row"><span class="lbl">Departure Date</span><span class="val">${departureDate}</span></div>
      <div class="row"><span class="lbl">Departure Time</span><span class="val">${departureTime}</span></div>
      <div class="rejection"><strong>Rejection Reason:</strong><br>${rejectionReason}</div>
      ${hodComments && hodComments !== 'None'
        ? `<div class="comments"><strong>Additional Comments:</strong> ${hodComments}</div>`
        : ''}
    </div>
    <p style="font-size:13px;color:#475569">You may submit a new request with updated information if needed.</p>
    <a href="${dashboardUrl}" class="btn">View in Dashboard &#8594;</a>
  </div>
  <div class="ftr">HOD Approval System &bull; NMIT &bull; Automated Notification</div>
</div>
</body></html>`;
    await (0, exports.sendEmail)(facultyEmail, `Request Rejected - ${departureDate}`, html);
};
exports.sendRejectedEmail = sendRejectedEmail;
//# sourceMappingURL=email.js.map