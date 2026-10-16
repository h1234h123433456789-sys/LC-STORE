import express from 'express';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// In-memory store for OTPs: email -> { otp, name, phone, expiresAt, attempts, createdAt }
const otpStore = new Map<string, { 
  otp: string; 
  name: string; 
  phone: string; 
  expiresAt: number; 
  attempts: number;
  lastSentAt: number;
}>();

// Custom runtime email configuration (can also be configured by store owner via Admin settings)
let customResendKey = process.env.RESEND_API_KEY || '';
let customBrevoKey = process.env.BREVO_API_KEY || '';

// API: Check email provider configuration status
app.get('/api/email-config-status', (req, res) => {
  const hasResend = !!(customResendKey || process.env.RESEND_API_KEY);
  const hasBrevo = !!(customBrevoKey || process.env.BREVO_API_KEY);
  const hasSmtp = !!(process.env.SMTP_HOST || process.env.GMAIL_USER);

  res.json({
    configured: hasResend || hasBrevo || hasSmtp,
    provider: hasResend ? 'Resend' : hasBrevo ? 'Brevo' : hasSmtp ? 'SMTP/Gmail' : 'Direct Service',
  });
});

// API: Set runtime email key from Admin Portal
app.post('/api/admin/set-email-key', (req, res) => {
  const { provider, apiKey } = req.body;
  if (provider === 'resend') {
    customResendKey = apiKey;
    return res.json({ success: true, message: 'تم تحديث مفتاح Resend بنجاح' });
  } else if (provider === 'brevo') {
    customBrevoKey = apiKey;
    return res.json({ success: true, message: 'تم تحديث مفتاح Brevo بنجاح' });
  }
  return res.status(400).json({ error: 'نوع المزود غير معروف' });
});

// Helper function to send email via available services
async function sendEmailOtpMessage({
  to,
  name,
  phone,
  otp
}: {
  to: string;
  name: string;
  phone: string;
  otp: string;
}): Promise<{ success: boolean; provider: string; error?: string }> {
  const resendKey = customResendKey || process.env.RESEND_API_KEY;
  const brevoKey = customBrevoKey || process.env.BREVO_API_KEY;

  const htmlContent = `
    <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 580px; margin: 0 auto; background-color: #0b0b0e; color: #ffffff; border-radius: 16px; border: 1px solid rgba(212, 175, 55, 0.35); padding: 32px; text-align: right;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #D4AF37; font-size: 38px; margin: 0; letter-spacing: 6px; font-weight: 900;">LC</h1>
        <p style="color: #D4AF37; font-size: 13px; font-weight: bold; margin-top: 4px; letter-spacing: 2px;">LUXURY BOUTIQUE</p>
      </div>
      
      <div style="background-color: #14141a; border-radius: 14px; padding: 26px; border: 1px solid rgba(212, 175, 55, 0.2); margin-bottom: 24px;">
        <p style="font-size: 16px; color: #ededed; margin: 0 0 14px 0;">مرحباً بك يا <strong>${name}</strong> في متجر LC،</p>
        <p style="font-size: 14px; color: #b5b5b5; margin: 0 0 20px 0; line-height: 1.7;">
          لقد طلبت رمز التحقق لتأكيد حسابك وتوثيق رقم هاتفك <strong>(${phone})</strong> لتسليم الطلبات مباشرة مع ميزة الدفع كاش عند الاستلام.
        </p>
        
        <div style="text-align: center; margin: 28px 0;">
          <div style="display: inline-block; background: linear-gradient(135deg, #1f1d16, #2d281a); border: 2px solid #D4AF37; border-radius: 14px; padding: 16px 36px; box-shadow: 0 0 25px rgba(212, 175, 55, 0.25);">
            <span style="font-size: 38px; font-weight: bold; letter-spacing: 12px; color: #F3E5AB; font-family: monospace;">${otp}</span>
          </div>
          <p style="font-size: 12px; color: #999999; margin-top: 10px;">رمز التحقق الخاص بك (OTP)</p>
        </div>

        <p style="font-size: 12px; color: #888888; text-align: center; margin: 0; line-height: 1.5;">
          ⏱️ هذا الرمز صالح للاستخدام لمدة 10 دقائق فقط. لا تشارك هذا الرمز مع أي شخص آخر للحفاظ على خصوصيتك.
        </p>
      </div>

      <div style="text-align: center; font-size: 11px; color: #777777; border-top: 1px solid #222228; padding-top: 18px; line-height: 1.6;">
        <p style="margin: 0 0 4px 0; color: #a0a0a0;">متجر LC الفاخر · توصيل سريع لكافة المحافظات · معاينة الطلب والدفع كاش عند الاستلام</p>
        <p style="margin: 0;">إذا لم تقم بطلب هذا الرمز، يمكنك تجاهل هذا البريد بأمان.</p>
      </div>
    </div>
  `;

  // Try Resend API if key is present
  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      const data = await resend.emails.send({
        from: 'LC Luxury Boutique <onboarding@resend.dev>',
        to: [to],
        subject: `${otp} هو رمز التحقق الخاص بك - متجر LC الفاخر`,
        html: htmlContent,
      });

      if (data.error) {
        console.warn('Resend send note:', data.error);
      } else {
        console.log(`Email OTP sent successfully via Resend to ${to}`);
        return { success: true, provider: 'Resend' };
      }
    } catch (e: any) {
      console.warn('Resend provider attempt failed:', e.message);
    }
  }

  // Fallback 1: Brevo API
  if (brevoKey) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'LC Luxury Boutique', email: 'no-reply@lcboutique.iq' },
          to: [{ email: to, name }],
          subject: `${otp} هو رمز التحقق الخاص بك - متجر LC الفاخر`,
          htmlContent: htmlContent
        })
      });

      if (response.ok) {
        console.log(`Email OTP sent successfully via Brevo to ${to}`);
        return { success: true, provider: 'Brevo' };
      }
    } catch (e: any) {
      console.warn('Brevo provider attempt failed:', e.message);
    }
  }

  // Fallback 2: Direct Nodemailer SMTP (Gmail / Custom SMTP)
  if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: `"متجر LC الفاخر" <${process.env.GMAIL_USER}>`,
        to,
        subject: `${otp} هو رمز التحقق الخاص بك - متجر LC الفاخر`,
        html: htmlContent,
      });

      console.log(`Email OTP sent successfully via Gmail SMTP to ${to}`);
      return { success: true, provider: 'Gmail SMTP' };
    } catch (e: any) {
      console.warn('Gmail SMTP provider attempt failed:', e.message);
    }
  }

  // Fallback 3: Ethereal test SMTP account (For local dev testing with instant preview URL)
  try {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const info = await transporter.sendMail({
      from: '"LC Luxury Boutique" <no-reply@lcboutique.iq>',
      to,
      subject: `${otp} هو رمز التحقق الخاص بك - متجر LC الفاخر`,
      html: htmlContent,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[DEV OTP PREVIEW] Email sent to ${to}. Preview link: ${previewUrl}`);
    return { success: true, provider: 'Ethereal Test SMTP (Simulated)' };
  } catch (e: any) {
    console.error('All email delivery options failed:', e.message);
    return { success: false, provider: 'None', error: e.message };
  }
}

// API: Send Email OTP
app.post('/api/send-email-otp', async (req, res) => {
  try {
    const { email, name, phone } = req.body;

    if (!email || !String(email).includes('@')) {
      return res.status(400).json({ error: 'يرجى إدخال بريد إلكتروني صحيح' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = name ? String(name).trim() : 'عميلنا العزيز';
    const cleanPhone = phone ? String(phone).trim() : 'غير محدد';

    const existing = otpStore.get(cleanEmail);
    if (existing && Date.now() - existing.lastSentAt < 45 * 1000) {
      const waitSeconds = Math.ceil((45 * 1000 - (Date.now() - existing.lastSentAt)) / 1000);
      return res.status(429).json({ 
        error: `يرجى الانتظار ${waitSeconds} ثانية قبل طلب رمز جديد` 
      });
    }

    // Generate 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    otpStore.set(cleanEmail, {
      otp,
      name: cleanName,
      phone: cleanPhone,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes validity
      attempts: 0,
      lastSentAt: Date.now()
    });

    // Send email via available provider
    const sendResult = await sendEmailOtpMessage({
      to: cleanEmail,
      name: cleanName,
      phone: cleanPhone,
      otp
    });

    return res.json({
      success: true,
      message: `تم إرسال رمز التحقق إلى بريدك الإلكتروني (${cleanEmail})`,
      emailDelivered: sendResult.success,
      provider: sendResult.provider,
    });
  } catch (error) {
    console.error('Server error in /api/send-email-otp:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء معالجة الطلب، يرجى المحاولة ثانية' });
  }
});

// API: Verify Email OTP
app.post('/api/verify-email-otp', (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'البريد الإلكتروني ورمز التحقق مطلوبان' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    const record = otpStore.get(cleanEmail);

    if (!record) {
      return res.status(400).json({ 
        error: 'لم يتم العثور على طلب تحقق لهذا البريد أو انتهت صلاحيته. يرجى طلب رمز جديد.' 
      });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanEmail);
      return res.status(400).json({ error: 'انتهت صلاحية الرمز (10 دقائق). يرجى طلب رمز جديد.' });
    }

    if (record.attempts >= 5) {
      otpStore.delete(cleanEmail);
      return res.status(400).json({ error: 'تم تجاوز الحد الأقصى للمحاولات الخاطئة. يرجى طلب رمز جديد.' });
    }

    if (record.otp !== cleanOtp) {
      record.attempts += 1;
      return res.status(400).json({ 
        error: `رمز التحقق غير صحيح (المحاولة ${record.attempts} من 5)` 
      });
    }

    // Success! Remove used OTP
    otpStore.delete(cleanEmail);

    const user = {
      id: `usr-${Date.now()}`,
      name: record.name,
      email: cleanEmail,
      phone: record.phone,
      contactType: 'email',
      contactValue: cleanEmail,
      joinedAt: new Date().toISOString()
    };

    return res.json({
      success: true,
      message: 'تم التحقق من الحساب بنجاح',
      user
    });
  } catch (error) {
    console.error('Server error in /api/verify-email-otp:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء التحقق من الرمز' });
  }
});

// Start server with Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static production build
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`LC Boutique Fullstack server is running on http://localhost:${PORT}`);
  });
}

startServer();
