// app/api/send-notification-email/route.js
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request) {
  console.log('========================================');
  console.log('📧 EMAIL API CALLED');
  console.log('========================================');
  
  try {
    const body = await request.json();
    console.log('📦 Request body received:', JSON.stringify(body, null, 2));
    
    const { emails, notification } = body;

    if (!emails || emails.length === 0) {
      console.log('❌ No email addresses provided');
      return NextResponse.json(
        { error: 'No email addresses provided' },
        { status: 400 }
      );
    }

    console.log('📧 Target emails:', emails);
    console.log('🔔 Notification type:', notification.type);
    console.log('⚠️ Notification severity:', notification.severity);

    // Check environment variables
    console.log('🔍 Checking environment variables...');
    console.log('EMAIL_USER exists:', !!process.env.EMAIL_USER);
    console.log('EMAIL_USER value:', process.env.EMAIL_USER);
    console.log('EMAIL_PASSWORD exists:', !!process.env.EMAIL_PASSWORD);
    console.log('EMAIL_PASSWORD length:', process.env.EMAIL_PASSWORD?.length || 0);
    console.log('APP_URL:', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log('❌ Missing email credentials in environment variables');
      return NextResponse.json(
        { error: 'Email credentials not configured' },
        { status: 500 }
      );
    }

    // Configure email transport
    console.log('🔧 Configuring email transporter...');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Verify connection
    console.log('🔌 Verifying SMTP connection...');
    try {
      await transporter.verify();
      console.log('✅ SMTP connection verified successfully');
    } catch (verifyError) {
      console.log('❌ SMTP verification failed:', verifyError.message);
      return NextResponse.json(
        { error: 'SMTP verification failed', details: verifyError.message },
        { status: 500 }
      );
    }

    // Create email content
    const emailSubject = `${notification.severity === 'critical' ? '🔴 CRITICAL' : '⚠️'} ${notification.title}`;
    console.log('📝 Email subject:', emailSubject);
    
    let emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: ${notification.severity === 'critical' ? '#dc2626' : '#f59e0b'};
              color: white;
              padding: 20px;
              border-radius: 8px 8px 0 0;
            }
            .content {
              background-color: #f9fafb;
              padding: 20px;
              border-radius: 0 0 8px 8px;
            }
            .alert-box {
              background-color: white;
              border-left: 4px solid ${notification.severity === 'critical' ? '#dc2626' : '#f59e0b'};
              padding: 15px;
              margin: 15px 0;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .detail-label {
              font-weight: bold;
              color: #6b7280;
            }
            .detail-value {
              color: #111827;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #6b7280;
              font-size: 12px;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #2563eb;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">${notification.title}</h1>
            </div>
            <div class="content">
              <div class="alert-box">
                <p style="margin: 0 0 10px 0; font-size: 16px;">${notification.message}</p>
              </div>
    `;

    // Add item details if available
    if (notification.item) {
      console.log('📦 Adding item details to email');
      emailHtml += `
              <h3>Item Details:</h3>
              <div style="background-color: white; padding: 15px; border-radius: 6px;">
                <div class="detail-row">
                  <span class="detail-label">Item Name:</span>
                  <span class="detail-value">${notification.item.name}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">SKU:</span>
                  <span class="detail-value">${notification.item.sku}</span>
                </div>
      `;

      if (notification.type !== 'expiry_alert') {
        emailHtml += `
                <div class="detail-row">
                  <span class="detail-label">Current Stock:</span>
                  <span class="detail-value">${notification.item.current_stock} ${notification.item.units?.abbreviation || ''}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Minimum Stock:</span>
                  <span class="detail-value">${notification.item.minimum_stock} ${notification.item.units?.abbreviation || ''}</span>
                </div>
        `;
      }

      emailHtml += `
              </div>
      `;
    }

    emailHtml += `
              <p style="margin-top: 20px;">
                <strong>Time:</strong> ${new Date(notification.created_at || Date.now()).toLocaleString()}
              </p>
              
              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/notifications" class="button">
                  View in Dashboard
                </a>
              </div>
            </div>
            <div class="footer">
              <p>This is an automated notification from your Inventory Management System.</p>
              <p>Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Prepare mail options
    const mailOptions = {
      from: `"Inventory Management System" <${process.env.EMAIL_USER}>`,
      to: emails.join(', '),
      subject: emailSubject,
      html: emailHtml,
    };

    console.log('📨 Sending email...');
    console.log('From:', mailOptions.from);
    console.log('To:', mailOptions.to);
    console.log('Subject:', mailOptions.subject);

    const info = await transporter.sendMail(mailOptions);

    console.log('✅ Email sent successfully!');
    console.log('📬 Message ID:', info.messageId);
    console.log('📊 Response:', info.response);
    console.log('========================================');

    return NextResponse.json({ 
      success: true, 
      message: 'Email sent successfully',
      messageId: info.messageId
    });

  } catch (error) {
    console.log('========================================');
    console.log('❌ ERROR SENDING EMAIL');
    console.log('Error name:', error.name);
    console.log('Error message:', error.message);
    console.log('Error code:', error.code);
    console.log('Full error:', error);
    console.log('========================================');
    
    return NextResponse.json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    );
  }
}