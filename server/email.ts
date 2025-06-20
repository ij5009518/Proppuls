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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Dear ${userName},</p>
        <p>We received a request to reset your password for your Property Management Platform account.</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p>Click the button below to reset your password:</p>
          <a href="${resetUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0;">Reset Password</a>
          <p style="margin-top: 15px; font-size: 14px; color: #666;">Or copy and paste this link in your browser:</p>
          <p style="font-size: 14px; word-break: break-all;">${resetUrl}</p>
        </div>
        <p><strong>This link will expire in 1 hour.</strong></p>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <p>Best regards,<br>Property Management Team</p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `Password Reset Request`,
      html,
    });
  }
}

export const emailService = new EmailService();