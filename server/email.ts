import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

interface RentReminderData {
  tenantName: string;
  unitNumber: string;
  propertyName: string;
  amount: number;
  dueDate: string;
}

interface MaintenanceNotificationData {
  tenantName: string;
  unitNumber: string;
  propertyName: string;
  description: string;
  status: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Check if required environment variables are set
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('SMTP credentials not configured. Email functionality will not work.');
      console.warn('Please set SMTP_USER and SMTP_PASS environment variables.');
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Add some additional options for better compatibility
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  async sendRentReminder(to: string, data: RentReminderData): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Rent Payment Reminder</h2>
        <p>Dear ${data.tenantName},</p>
        <p>This is a friendly reminder that your rent payment is due.</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Payment Details:</h3>
          <p><strong>Property:</strong> ${data.propertyName}</p>
          <p><strong>Unit:</strong> ${data.unitNumber}</p>
          <p><strong>Amount Due:</strong> $${data.amount.toFixed(2)}</p>
          <p><strong>Due Date:</strong> ${data.dueDate}</p>
        </div>
        <p>Please ensure your payment is submitted on time to avoid any late fees.</p>
        <p>Thank you,<br>Property Management Team</p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `Rent Payment Reminder - ${data.propertyName} Unit ${data.unitNumber}`,
      html,
    });
  }

  async sendMaintenanceNotification(to: string, data: MaintenanceNotificationData): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Maintenance Request Update</h2>
        <p>Dear ${data.tenantName},</p>
        <p>We have an update regarding your maintenance request.</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Request Details:</h3>
          <p><strong>Property:</strong> ${data.propertyName}</p>
          <p><strong>Unit:</strong> ${data.unitNumber}</p>
          <p><strong>Description:</strong> ${data.description}</p>
          <p><strong>Status:</strong> <span style="color: ${data.status === 'completed' ? '#28a745' : '#ffc107'};">${data.status.toUpperCase()}</span></p>
        </div>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <p>Best regards,<br>Property Management Team</p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `Maintenance Update - ${data.propertyName} Unit ${data.unitNumber}`,
      html,
    });
  }

  async sendWelcomeEmail(to: string, userName: string, organizationName: string, unitNumber: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Property Management Platform!</h2>
        <p>Dear ${userName},</p>
        <p>Welcome! Your account has been successfully created.</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Account Details:</h3>
          <p><strong>Organization:</strong> ${organizationName}</p>
          <p><strong>Email:</strong> ${to}</p>
        </div>
        <p>You can now log in to your account and start managing your properties.</p>
        <p>If you have any questions, please don't hesitate to contact our support team.</p>
        <p>Best regards,<br>Property Management Team</p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `Welcome to Property Management Platform`,
      html,
    });
  }

  async sendPasswordResetEmail(to: string, userName: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">Property Manager</h1>
        </div>
        
        <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
        
        <p style="color: #555; line-height: 1.6;">Hi ${userName},</p>
        
        <p style="color: #555; line-height: 1.6;">
          You requested to reset your password for your Property Manager account. 
          Click the button below to create a new password:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            Reset My Password
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px; line-height: 1.6;">
          Or copy and paste this link into your browser:
        </p>
        <p style="word-break: break-all; color: #2563eb; background: #f8fafc; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 13px;">
          ${resetUrl}
        </p>
        
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
          <p style="color: #dc2626; margin: 0; font-size: 14px;">
            <strong>Security Notice:</strong> This link will expire in 1 hour. If you didn't request this password reset, please ignore this email and your account will remain secure.
          </p>
        </div>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          This is an automated message from Property Manager. Please do not reply to this email.
        </p>
      </div>
    `;

    const text = `
Password Reset Request - Property Manager

Hi ${userName},

You requested to reset your password for your Property Manager account.

Click this link to reset your password: ${resetUrl}

SECURITY NOTICE: This link will expire in 1 hour for security reasons. If you didn't request this password reset, you can safely ignore this email.

---
This is an automated message from Property Manager. Please do not reply to this email.
    `;

    return await this.sendEmail({
      to,
      subject: 'Reset Your Property Manager Password',
      html,
      text
    });
  }

  async sendPasswordResetConfirmation(to: string, userName: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">Property Manager</h1>
        </div>
        
        <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #16a34a; margin: 0 0 10px 0;">Password Successfully Reset</h2>
        </div>
        
        <p style="color: #555; line-height: 1.6;">Hi ${userName},</p>
        
        <p style="color: #555; line-height: 1.6;">
          Your password has been successfully reset for your Property Manager account. 
          You can now log in with your new password.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/login" 
             style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            Log In to Your Account
          </a>
        </div>
        
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
          <p style="color: #dc2626; margin: 0; font-size: 14px;">
            <strong>Security Notice:</strong> If you didn't change your password, please contact support immediately at support@propertymanager.com
          </p>
        </div>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          This is an automated message from Property Manager. Please do not reply to this email.
        </p>
      </div>
    `;

    const text = `
Password Successfully Reset - Property Manager

Hi ${userName},

Your password has been successfully reset for your Property Manager account. You can now log in with your new password.

Log in at: ${process.env.FRONTEND_URL || 'http://localhost:5000'}/login

SECURITY NOTICE: If you didn't change your password, please contact support immediately.

---
This is an automated message from Property Manager. Please do not reply to this email.
    `;

    return await this.sendEmail({
      to,
      subject: 'Password Reset Confirmation - Property Manager',
      html,
      text
    });
  }
}

export const emailService = new EmailService();