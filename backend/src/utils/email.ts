// backend/src/utils/email.ts
// ENHANCED EMAIL SYSTEM WITH PROFESSIONAL TEMPLATES

import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

interface RequestCreatedEmailData {
  hodEmail: string;
  hodName: string;
  facultyName: string;
  facultyEmail: string;
  department: string;
  departureDate: string;
  departureTime: string;
  urgencyLevel: string;
  reason: string;
}

interface RequestApprovedEmailData {
  facultyEmail: string;
  facultyName: string;
  exitPassNumber: string;
  departureDate: string;
  departureTime: string;
  hodComments: string;
  qrCode: string;
}

interface RequestRejectedEmailData {
  facultyEmail: string;
  facultyName: string;
  departureDate: string;
  departureTime: string;
  rejectionReason: string;
  hodComments: string;
}

// Create reusable transporter
let transporter: any = null;

// Only create transporter if credentials are provided
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  // Test connection
  transporter.verify((error: any) => {
    if (error) {
      console.error('❌ Email configuration error:', error.message);
      console.log('📧 Email notifications will be disabled');
    } else {
      console.log('✅ Email server ready');
    }
  });
} else {
  console.log('⚠️  Email credentials not configured - emails will be skipped');
  console.log('📧 To enable emails, set SMTP_USER and SMTP_PASS in .env file');
}

/* ================= BASE EMAIL FUNCTION ================= */

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    // Skip if transporter not configured
    if (!transporter) {
      console.log('⚠️  Email skipped (not configured):', options.subject);
      return;
    }

    const mailOptions = {
      from: options.from || process.env.SMTP_FROM || `HOD Approval System <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${options.to}`);
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw error;
  }
};

/* ================= TEMPLATE: REQUEST CREATED (Faculty → HOD) ================= */

export const sendRequestCreatedEmail = async (data: RequestCreatedEmailData): Promise<void> => {
  const urgencyColors: any = {
    CRITICAL: '#dc2626',
    HIGH: '#ea580c',
    MEDIUM: '#f59e0b',
    LOW: '#10b981'
  };

  const urgencyColor = urgencyColors[data.urgencyLevel] || '#6b7280';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #334155; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
        .header { background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); padding: 40px 20px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
        .content { padding: 40px 30px; background: #f8fafc; }
        .card { background: white; border-radius: 12px; padding: 24px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .card-title { font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 16px; }
        .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
        .info-row:last-child { border-bottom: none; }
        .info-label { font-weight: 600; color: #64748b; }
        .info-value { color: #1e293b; }
        .urgency-badge { display: inline-block; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 14px; color: white; background: ${urgencyColor}; }
        .reason-box { background: #f1f5f9; border-left: 4px solid #2563eb; padding: 16px; border-radius: 8px; margin-top: 16px; }
        .button { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #2563eb, #4f46e5); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
        .footer { text-align: center; padding: 30px; color: #64748b; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 New Early Departure Request</h1>
        </div>
        
        <div class="content">
          <p style="font-size: 16px; margin-bottom: 20px;">
            Dear <strong>${data.hodName}</strong>,
          </p>
          
          <p>A new early departure request has been submitted by <strong>${data.facultyName}</strong> from the <strong>${data.department}</strong> department and requires your approval.</p>
          
          <div class="card">
            <div class="card-title">Request Details</div>
            
            <div class="info-row">
              <span class="info-label">Faculty Name:</span>
              <span class="info-value">${data.facultyName}</span>
            </div>
            
            <div class="info-row">
              <span class="info-label">Email:</span>
              <span class="info-value">${data.facultyEmail}</span>
            </div>
            
            <div class="info-row">
              <span class="info-label">Department:</span>
              <span class="info-value">${data.department}</span>
            </div>
            
            <div class="info-row">
              <span class="info-label">Departure Date:</span>
              <span class="info-value">${data.departureDate}</span>
            </div>
            
            <div class="info-row">
              <span class="info-label">Departure Time:</span>
              <span class="info-value">${data.departureTime}</span>
            </div>
            
            <div class="info-row">
              <span class="info-label">Urgency Level:</span>
              <span class="info-value"><span class="urgency-badge">${data.urgencyLevel}</span></span>
            </div>
            
            <div class="reason-box">
              <strong>Reason:</strong><br/>
              ${data.reason}
            </div>
          </div>
          
          <p style="margin-top: 30px;">
            Please review and take action on this request at your earliest convenience.
          </p>
          
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/hod/dashboard" class="button">
            View in Dashboard →
          </a>
        </div>
        
        <div class="footer">
          <p>This is an automated notification from the HOD Approval System.</p>
          <p style="margin-top: 10px; color: #94a3b8;">© 2026 HOD Approval System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: data.hodEmail,
    subject: `🔔 New Request from ${data.facultyName} - ${data.urgencyLevel} Priority`,
    html
  });
};

/* ================= TEMPLATE: REQUEST APPROVED (HOD → Faculty) ================= */

export const sendRequestApprovedEmail = async (data: RequestApprovedEmailData): Promise<void> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #334155; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
        .content { padding: 40px 30px; background: #f8fafc; }
        .card { background: white; border-radius: 12px; padding: 24px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .card-title { font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 16px; }
        .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
        .info-row:last-child { border-bottom: none; }
        .info-label { font-weight: 600; color: #64748b; }
        .info-value { color: #1e293b; }
        .exit-pass { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
        .exit-pass-number { font-size: 24px; font-weight: 700; letter-spacing: 2px; margin: 10px 0; }
        .qr-container { text-align: center; background: white; padding: 20px; border-radius: 12px; margin: 20px 0; }
        .qr-container img { max-width: 250px; }
        .comments-box { background: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; border-radius: 8px; margin-top: 16px; }
        .button { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #10b981, #059669); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
        .footer { text-align: center; padding: 30px; color: #64748b; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Request Approved!</h1>
        </div>
        
        <div class="content">
          <p style="font-size: 16px; margin-bottom: 20px;">
            Dear <strong>${data.facultyName}</strong>,
          </p>
          
          <p>Great news! Your early departure request has been <strong style="color: #10b981;">APPROVED</strong> by your HOD.</p>
          
          <div class="exit-pass">
            <div style="font-size: 14px; opacity: 0.9;">Exit Pass Number</div>
            <div class="exit-pass-number">${data.exitPassNumber}</div>
            <div style="font-size: 14px; opacity: 0.9; margin-top: 10px;">Save this for your records</div>
          </div>
          
          <div class="card">
            <div class="card-title">Request Details</div>
            
            <div class="info-row">
              <span class="info-label">Departure Date:</span>
              <span class="info-value">${data.departureDate}</span>
            </div>
            
            <div class="info-row">
              <span class="info-label">Departure Time:</span>
              <span class="info-value">${data.departureTime}</span>
            </div>
            
            <div class="info-row">
              <span class="info-label">Exit Pass Number:</span>
              <span class="info-value"><strong>${data.exitPassNumber}</strong></span>
            </div>
            
            ${data.hodComments !== 'None' ? `
              <div class="comments-box">
                <strong>HOD Comments:</strong><br/>
                ${data.hodComments}
              </div>
            ` : ''}
          </div>
          
          <div class="qr-container">
            <p style="margin-bottom: 15px; color: #64748b;"><strong>Your Exit Pass QR Code</strong></p>
            <img src="${data.qrCode}" alt="Exit Pass QR Code" />
            <p style="margin-top: 15px; font-size: 14px; color: #64748b;">Present this QR code when leaving campus</p>
          </div>
          
          <p style="margin-top: 30px;">
            Please carry your exit pass and QR code with you on the day of departure.
          </p>
          
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/faculty/dashboard" class="button">
            View in Dashboard →
          </a>
        </div>
        
        <div class="footer">
          <p>This is an automated notification from the HOD Approval System.</p>
          <p style="margin-top: 10px; color: #94a3b8;">© 2026 HOD Approval System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: data.facultyEmail,
    subject: `✅ Request Approved - Exit Pass ${data.exitPassNumber}`,
    html
  });
};

/* ================= TEMPLATE: REQUEST REJECTED (HOD → Faculty) ================= */

export const sendRequestRejectedEmail = async (data: RequestRejectedEmailData): Promise<void> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #334155; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
        .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 20px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
        .content { padding: 40px 30px; background: #f8fafc; }
        .card { background: white; border-radius: 12px; padding: 24px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .card-title { font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 16px; }
        .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
        .info-row:last-child { border-bottom: none; }
        .info-label { font-weight: 600; color: #64748b; }
        .info-value { color: #1e293b; }
        .rejection-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 8px; margin-top: 16px; }
        .comments-box { background: #f8fafc; border-left: 4px solid #64748b; padding: 16px; border-radius: 8px; margin-top: 16px; }
        .button { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #2563eb, #4f46e5); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
        .footer { text-align: center; padding: 30px; color: #64748b; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>❌ Request Not Approved</h1>
        </div>
        
        <div class="content">
          <p style="font-size: 16px; margin-bottom: 20px;">
            Dear <strong>${data.facultyName}</strong>,
          </p>
          
          <p>We regret to inform you that your early departure request has been <strong style="color: #ef4444;">REJECTED</strong> by your HOD.</p>
          
          <div class="card">
            <div class="card-title">Request Details</div>
            
            <div class="info-row">
              <span class="info-label">Departure Date:</span>
              <span class="info-value">${data.departureDate}</span>
            </div>
            
            <div class="info-row">
              <span class="info-label">Departure Time:</span>
              <span class="info-value">${data.departureTime}</span>
            </div>
            
            <div class="rejection-box">
              <strong style="color: #dc2626;">Rejection Reason:</strong><br/>
              ${data.rejectionReason}
            </div>
            
            ${data.hodComments !== 'None' ? `
              <div class="comments-box">
                <strong>Additional Comments:</strong><br/>
                ${data.hodComments}
              </div>
            ` : ''}
          </div>
          
          <p style="margin-top: 30px;">
            If you have any questions or need clarification, please contact your HOD directly. You may submit a new request with updated information if needed.
          </p>
          
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/faculty/dashboard" class="button">
            View in Dashboard →
          </a>
        </div>
        
        <div class="footer">
          <p>This is an automated notification from the HOD Approval System.</p>
          <p style="margin-top: 10px; color: #94a3b8;">© 2026 HOD Approval System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: data.facultyEmail,
    subject: `❌ Request Update - Action Required`,
    html
  });
};

/* ================= BULK EMAIL ================= */

export const sendBulkEmail = async (
  recipients: string[],
  subject: string,
  html: string
): Promise<void> => {
  try {
    const promises = recipients.map(recipient =>
      sendEmail({ to: recipient, subject, html })
    );
    await Promise.all(promises);
    console.log(`✅ Bulk email sent to ${recipients.length} recipients`);
  } catch (error) {
    console.error('❌ Bulk email sending failed:', error);
    throw error;
  }
};
