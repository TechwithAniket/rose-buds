const nodemailer = require("nodemailer");
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require('bcryptjs');
require('dotenv').config();

console.log("SERVER IS CONNECTED TO:", process.env.DATABASE_URL);
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

// Temporary RAM storage for OTP delivery.
const pendingOtpDelivery = new Map();
const pendingOtp = new Map();

// --- BOT PROTECTION ---
const rateLimitMap = new Map();

function checkRateLimit(req, limit = 5, windowMinutes = 15) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowStart = now - (windowMinutes * 60 * 1000);

  let requests = rateLimitMap.get(ip) || [];
  requests = requests.filter(timestamp => timestamp > windowStart);

  if (requests.length >= limit) {
    rateLimitMap.set(ip, requests); 
    return false; 
  }

  requests.push(now);
  rateLimitMap.set(ip, requests);
  return true;
}

// Static school info in memory
const defaultDb = {
  school: {
    name: "Rose Buds Public School",
    tagline: "Character is the greatest virtue.",
    notice: "Admissions are open. Parents can login to view dues and pay school fees online.",
    founded: "1997",
    address: "Opp. Gayatri Temple, Raj Avenue, Kale Road, Chheharta, Amritsar.",
    email: "sims_rosebuds@yahoo.com",
    website: "https://rosebudsschool.com",
    hours: "Summer 07:40 AM - 02:00 PM | Winter 08:15 AM - 02:30 PM",
    mapUrl: "https://www.bing.com/maps/search?name=Rose+Buds+Public+School&ppois=31.636823654174805_74.80619812011719_Rose+Buds+Public+School",
    upiId: "rosebudsschool@upi",
    bankName: "State Bank of India",
    accountName: "Rose Buds Public School",
    accountNumber: "123456789012",
    ifsc: "SBIN0001234",
    supportPhone: "+91 94630 11687",
  }
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

async function dispatchOTP(email, otpCode) {
  try {
    await transporter.sendMail({
      from: `"Rose Buds Public School" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Portal Login OTP",
      text: `Your Rose Buds Public School portal login OTP is: ${otpCode}\n\nThis code is valid for 5 minutes. Do not share it with anyone.`,
    });
    console.log(`[SECURE EMAIL] OTP sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error("Failed to send OTP Email:", error);
    return false;
  }
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function parseCookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .filter(Boolean)
      .map((part) => {
        const [key, ...value] = part.trim().split("=");
        return [key, decodeURIComponent(value.join("="))];
      }),
  );
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Request body is too large."));
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function publicUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

function feeStatus(student) {
  return student.paidAmount >= student.totalFees ? "paid" : "due";
}

async function getNextStudentId() {
  const year = new Date().getFullYear();
  const count = await prisma.student.count();
  return `RBPS-${year}-${String(count + 1).padStart(4, "0")}`;
}

function getRequestUrl(req) {
  const host = req.headers?.host || `localhost:${PORT}`;
  return new URL(req.url || "/", `http://${host}`);
}

// ==========================================
// SECURE DATABASE AUTHENTICATION
// ==========================================

async function getSession(req) {
  const token = parseCookies(req).session;
  if (!token) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { id: token },
      include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }
    return session.user;
  } catch (err) {
    return null;
  }
}

async function requireUser(req, res, roles) {
  const user = await getSession(req);
  if (!user) {
    sendJson(res, 401, { error: "Please login first." });
    return null;
  }
  if (roles && !roles.includes(user.role)) {
    sendJson(res, 403, { error: "You do not have permission for this action." });
    return null;
  }
  return user;
}

// ==========================================
// STATIC FILE SERVER
// ==========================================

function serveStatic(req, res) {
  const urlPath = getRequestUrl(req).pathname;
  const filePath =
    urlPath === "/"
      ? path.join(PUBLIC_DIR, "index.html")
      : path.join(PUBLIC_DIR, urlPath);
  const normalized = path.normalize(filePath);

  if (!normalized.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(normalized, (error, content) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const ext = path.extname(normalized);
    const contentTypes = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "application/javascript",
      ".json": "application/json",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
    };
    res.writeHead(200, {
      "Content-Type": contentTypes[ext] || "application/octet-stream",
    });
    res.end(content);
  });
}

// ==========================================
// API ROUTER
// ==========================================

async function handleApi(req, res) {
  const url = getRequestUrl(req);
  const route = `${req.method} ${url.pathname}`;

  try {
    // --- AUTHENTICATION ROUTES --- //
    
    if (route === "POST /api/login") {
  if (!checkRateLimit(req, "login", 5, 15)) {
    return sendJson(res, 429, { error: "Too many login attempts. Please wait." });
  }

  const body = await readBody(req);
  const email = String(body.email).toLowerCase();
  
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return sendJson(res, 401, { error: "Invalid email or password" });
  }

  const valid = await bcrypt.compare(body.password, user.passwordHash);
  if (!valid) {
    return sendJson(res, 401, { error: "Invalid email or password" });
  }

  // --- THE NEW AUTO-OTP LOGIC ---
  if (user.twoFactor) {
    const challengeId = crypto.randomUUID();
    const smsOtp = String(crypto.randomInt(100000, 999999));

    const emailSent = await dispatchOTP(user.email, smsOtp);
    if (!emailSent) {
      return sendJson(res, 500, { error: "Failed to send OTP email. Check server logs." });
    }

    pendingOtp.set(challengeId, {
      userId: user.id,
      method: "email",
      smsOtp,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    // This exact response triggers the frontend card to flip to the OTP section
    return sendJson(res, 200, {
      requiresOtp: true,
      challengeId,
      email: user.email,
      expiresInMinutes: 5,
    });
  }

  // Admin Login (No 2FA)
  const sessionToken = crypto.randomUUID();
  sessions.set(sessionToken, { userId: user.id, role: user.role, expires: Date.now() + 8 * 3600000 });
  
  res.setHeader(
    "Set-Cookie",
    `session=${sessionToken}; HttpOnly; Path=/; Max-Age=28800; SameSite=Strict${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  );
  
  return sendJson(res, 200, { success: true, requiresOtp: false });
}

if (route === "POST /api/request-otp") {
      // 1. Separate bucket for OTP requests (limit 10 for testing)
      if (!checkRateLimit(req, "request_otp", 10, 15)) {
        return sendJson(res, 429, { error: "Too many OTP requests. Please wait." });
      }

      const body = await readBody(req);
      const pending = pendingOtpDelivery.get(body.challengeId);

      // 2. Check if the login challenge is valid and hasn't expired
      if (!pending || pending.expiresAt < Date.now()) {
        return sendJson(res, 401, { error: "OTP request expired. Please login again." });
      }

      // 3. Find the real user in the database
      const user = await prisma.user.findUnique({ where: { id: pending.userId } });
      
      // 4. Generate the 6-digit mathematical code
      const smsOtp = String(crypto.randomInt(100000, 999999));

      // 5. TRY to send the real email and WAIT for Google's response
      const emailSent = await dispatchOTP(user.email, smsOtp);
      
      // 6. If Google/Nodemailer crashed, stop and tell the frontend the truth
      if (!emailSent) {
        return sendJson(res, 500, { error: "Server failed to send email. Check Render logs." });
      }

      // 7. If successful, lock the OTP into RAM for 5 minutes
      pendingOtp.set(body.challengeId, {
        userId: pending.userId,
        method: "email",
        smsOtp, // Keeping variable name as smsOtp so we don't break verification
        expiresAt: Date.now() + 5 * 60 * 1000,
      });
      pendingOtpDelivery.delete(body.challengeId); // Clean up the delivery challenge

      // 8. Tell the frontend success
      return sendJson(res, 200, {
        method: "email",
        delivery: `OTP has been emailed to ${user.email}`,
        expiresInMinutes: 5,
      });
    }

    if (route === "POST /api/verify-otp") {
      if (!checkRateLimit(req, 20, 15)) {
        return sendJson(res, 429, { error: "Too many failed attempts. Try again later." });
      }

      const body = await readBody(req);
      const challenge = pendingOtp.get(body.challengeId);
      const smsOtpMatches = challenge?.smsOtp === String(body.smsOtp || "");
      
      if (!challenge || challenge.expiresAt < Date.now() || !smsOtpMatches) {
        return sendJson(res, 401, { error: "Invalid or expired OTP." });
      }

      const user = await prisma.user.findUnique({ where: { id: challenge.userId } });
      pendingOtp.delete(body.challengeId);
      
      const token = crypto.randomUUID();
      
      await prisma.session.create({
        data: {
          id: token,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });
   
      const isProd = process.env.NODE_ENV === "production";
      const cookieStr = `session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800; ${isProd ? "Secure;" : ""}`;

      res.writeHead(200, {
        "Content-Type": "application/json",
        "Set-Cookie": cookieStr,
      });
      return res.end(JSON.stringify({ user: publicUser(user) }));
    }

    if (route === "POST /api/logout") {
      const token = parseCookies(req).session;
      if (token) {
        try {
          await prisma.session.delete({ where: { id: token } });
        } catch (err) {
          // Ignore if the session was already deleted
        }
      }
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Set-Cookie": "session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
      });
      return res.end(JSON.stringify({ ok: true }));
    }

    if (route === "GET /api/me") {
      const user = await getSession(req);
      if (!user) {
        return sendJson(res, 200, { user: null });
      }
      return sendJson(res, 200, { user: publicUser(user) });
    }

    // --- PUBLIC & DEBUG ROUTES --- //
    
    if (route === "GET /api/public") {
      const news = await prisma.news.findMany({ orderBy: { date: 'desc' } });
      return sendJson(res, 200, { school: defaultDb.school, news });
    }

    if (route === "GET /api/test-db") {
      try {
        const allStudents = await prisma.student.findMany();
        const allUsers = await prisma.user.findMany();
        return sendJson(res, 200, { 
          totalStudents: allStudents.length, 
          totalUsers: allUsers.length,
          students: allStudents 
        });
      } catch (error) {
        return sendJson(res, 500, { error: error.message });
      }
    }

    if (route === "GET /api/rescue") {
      try {
        await prisma.user.deleteMany({ where: { email: "admin@test.com" } });
        const secureHash = await bcrypt.hash("admin123", 10);
        const admin = await prisma.user.create({
          data: {
            name: "Super Admin",
            email: "admin@test.com",
            passwordHash: secureHash, 
            role: "admin",
            phone: "1234567890"
          }
        });
        return sendJson(res, 200, { message: "Admin revived with SECURE bcrypt password!" });
      } catch (error) {
        return sendJson(res, 500, { error: error.message });
      }
    }

    // --- PROTECTED ROUTES --- //
    
    if (route === "GET /api/dashboard") {
      const user = await requireUser(req, res);
      if (!user) return;

      const studentsRaw = await prisma.student.findMany();
      const students = studentsRaw.map((student) => ({
        ...student,
        status: feeStatus(student),
        dueAmount: Math.max(student.totalFees - student.paidAmount, 0),
      }));

      const schoolData = defaultDb.school;

      if (user.role === "admin") {
        const users = await prisma.user.findMany();
        const payments = await prisma.payment.findMany();
        const news = await prisma.news.findMany();

        return sendJson(res, 200, {
          user: publicUser(user),
          school: schoolData,
          users: users.map(publicUser),
          students,
          payments,
          news,
          messages: [], 
        });
      }

      if (user.role === "parent") {
        const childIds = user.children || [];
        const payments = await prisma.payment.findMany({
          where: { studentId: { in: childIds } }
        });
        
        return sendJson(res, 200, {
          user: publicUser(user),
          school: schoolData,
          students: students.filter((s) => childIds.includes(s.studentId)),
          payments,
        });
      }

      if (user.role === "student") {
        const payments = await prisma.payment.findMany({
          where: { studentId: user.studentId }
        });
        
        return sendJson(res, 200, {
          user: publicUser(user),
          school: schoolData,
          students: students.filter((s) => s.studentId === user.studentId),
          payments,
        });
      }

      if (user.role === "teacher") {
        const teacherStudents = students.filter((s) => s.className === user.className);
        const teacherStudentIds = teacherStudents.map(s => s.studentId);
        
        const payments = await prisma.payment.findMany({
          where: { studentId: { in: teacherStudentIds } }
        });

        return sendJson(res, 200, {
          user: publicUser(user),
          school: schoolData,
          students: teacherStudents,
          payments,
        });
      }
    }

    if (route === "PATCH /api/school") {
      const user = await requireUser(req, res, ["admin"]);
      if (!user) return;
      const body = await readBody(req);
      defaultDb.school = { ...defaultDb.school, ...body };
      return sendJson(res, 200, { school: defaultDb.school });
    }

    if (route === "POST /api/students") {
      const user = await requireUser(req, res, ["admin"]);
      if (!user) return;
      const body = await readBody(req);

      const password = body.studentPassword;
      const parentPassword = body.parentPassword;

      if (!password || !parentPassword) {
        return sendJson(res, 400, { error: "Student and Parent passwords must be explicitly set." });
      }
      const studentId = await getNextStudentId();

      const studentHash = await bcrypt.hash(password, 10);
      const parentHash = await bcrypt.hash(parentPassword, 10);

      const studentUser = await prisma.user.create({
        data: {
          role: "student",
          name: body.name,
          email: body.studentEmail,
          phone: body.studentPhone,
          passwordHash: studentHash,
          twoFactor: true,
          studentId: studentId,
        }
      });

      const parentUser = await prisma.user.create({
        data: {
          role: "parent",
          name: body.parentName,
          email: body.parentEmail,
          phone: body.parentPhone,
          passwordHash: parentHash,
          twoFactor: true,
          children: [studentId],
        }
      });

      const student = await prisma.student.create({
        data: {
          studentId: studentId,
          name: body.name,
          className: body.className,
          parentUserId: parentUser.id,
          studentUserId: studentUser.id,
          totalFees: Number(body.totalFees || 0),
          paidAmount: Number(body.paidAmount || 0),
          dueDate: body.dueDate || "",
        }
      });

      return sendJson(res, 201, {
        student,
        credentials: {
          studentEmail: body.studentEmail,
          studentPassword: password,
          parentEmail: body.parentEmail,
          parentPassword,
        },
      });
    }

    if (route === "POST /api/news") {
      const user = await requireUser(req, res, ["admin"]);
      if (!user) return;
      const body = await readBody(req);

      const item = await prisma.news.create({
        data: {
          title: body.title,
          category: body.category || "News",
          summary: body.summary || "",
          image: body.image || "",
          date: body.date || new Date().toISOString().slice(0, 10),
        }
      });
      return sendJson(res, 201, { item });
    }

    if (route === "POST /api/razorpay-order") {
      const user = await requireUser(req, res, ["parent"]);
      if (!user) return;
      const body = await readBody(req);
      
      if (!user.children.includes(body.studentId)) {
        return sendJson(res, 403, { error: "You can only pay fees for your own child." });
      }

      const student = await prisma.student.findUnique({ where: { studentId: body.studentId } });
      if (!student) return sendJson(res, 404, { error: "Student not found." });

      const amount = Number(body.amount || 0);
      if (amount <= 0) return sendJson(res, 400, { error: "Payment amount must be greater than zero." });

      return sendJson(res, 200, {
        orderId: `order_demo_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`,
        amount: Math.round(amount * 100),
        currency: "INR",
        keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_demo_key",
        studentName: student.name,
        schoolName: defaultDb.school.name,
        parentName: user.name,
        parentPhone: user.phone,
        parentEmail: user.email,
        demoMode: !process.env.RAZORPAY_KEY_ID,
      });
    }

    if (route === "PATCH /api/students") {
      const user = await requireUser(req, res, ["admin"]);
      if (!user) return;
      const body = await readBody(req);
      
      const updatedStudent = await prisma.student.update({
        where: { studentId: body.studentId },
        data: {
          name: body.name,
          className: body.className,
          dueDate: body.dueDate,
          totalFees: body.totalFees !== undefined ? Number(body.totalFees) : undefined,
          paidAmount: body.paidAmount !== undefined ? Number(body.paidAmount) : undefined,
        }
      });
      
      return sendJson(res, 200, { student: updatedStudent });
    }

    if (route === "DELETE /api/students") {
      const user = await requireUser(req, res, ["admin"]); 
      if (!user) return;

      try {
        const buffers = [];
        for await (const chunk of req) {
          buffers.push(chunk);
        }
        const rawData = Buffer.concat(buffers).toString();
        const body = JSON.parse(rawData || "{}");
        const { studentId } = body;

        const student = await prisma.student.findUnique({
          where: { studentId: String(studentId) }
        });

        if (!student) {
          return sendJson(res, 404, { error: "Student not found in database." });
        }

        await prisma.payment.deleteMany({
          where: { studentId: String(studentId) }
        });

        await prisma.student.delete({
          where: { studentId: String(studentId) }
        });

        const usersToDelete = [];
        if (student.studentUserId) usersToDelete.push(student.studentUserId);
        if (student.parentUserId) usersToDelete.push(student.parentUserId);

        if (usersToDelete.length > 0) {
          await prisma.user.deleteMany({
            where: {
              id: { in: usersToDelete }
            }
          });
        }
        
        return sendJson(res, 200, { message: "Student completely wiped." });

      } catch (error) {
        console.error("--- CRASH IN DELETE ROUTE ---", error);
        return sendJson(res, 500, { error: "Server crashed during delete." });
      }
    }

    // --- SECURE RAZORPAY VERIFICATION --- //
    if (route === "POST /api/payments") {
      const user = await requireUser(req, res, ["parent"]);
      if (!user) return;
      const body = await readBody(req);
      
      if (!user.children.includes(body.studentId)) {
        return sendJson(res, 403, { error: "You can only pay fees for your own child." });
      }

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, studentId } = body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return sendJson(res, 400, { error: "Incomplete payment details. Cryptographic proof missing." });
      }

      const secret = process.env.RAZORPAY_KEY_SECRET || "rzp_test_demo_secret";
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        console.error(`🚨 ALERT: Invalid Razorpay Signature from User ${user.email}.`);
        return sendJson(res, 400, { error: "Payment verification failed. Invalid signature." });
      }
      
      const numAmount = Number(amount || 0);
      if (numAmount <= 0) return sendJson(res, 400, { error: "Payment amount must be greater than zero." });

      const payment = await prisma.$transaction(async (tx) => {
        const newPayment = await tx.payment.create({
          data: {
            studentId: studentId,
            amount: numAmount,
            mode: "RAZORPAY",
            reference: razorpay_payment_id,
            paidByUserId: user.id,
            status: "success",
            messageSent: false
          }
        });

        const updatedStudent = await tx.student.update({
          where: { studentId: studentId },
          data: {
            paidAmount: { increment: numAmount }
          }
        });

        return { payment: newPayment, student: updatedStudent };
      });

      return sendJson(res, 201, payment);
    }

    if (route === "POST /api/forgot-password") {
  if (!checkRateLimit(req, "forgot_password", 3, 15)) {
    return sendJson(res, 429, { error: "Too many requests. Please wait." });
  }
  const body = await readBody(req);
  const user = await prisma.user.findUnique({ where: { email: String(body.email).toLowerCase() } });
  if (!user) return sendJson(res, 404, { error: "Account with this email not found." });

  const challengeId = crypto.randomUUID();
  const resetOtp = String(crypto.randomInt(100000, 999999));
  
  const emailSent = await dispatchOTP(user.email, resetOtp);
  if (!emailSent) return sendJson(res, 500, { error: "Failed to send reset email." });

  pendingOtp.set(challengeId, { userId: user.id, resetOtp, expiresAt: Date.now() + 10 * 60 * 1000 });
  return sendJson(res, 200, { challengeId });
}

if (route === "POST /api/reset-password") {
  if (!checkRateLimit(req, "reset_password", 5, 15)) {
    return sendJson(res, 429, { error: "Too many failed attempts." });
  }
  const body = await readBody(req);
  const pending = pendingOtp.get(body.challengeId);
  
  if (!pending || pending.resetOtp !== body.otp || pending.expiresAt < Date.now()) {
    return sendJson(res, 401, { error: "Invalid or expired OTP." });
  }

  // Hash the new password and save it
  const passwordHash = await bcrypt.hash(body.newPassword, 10);
  await prisma.user.update({
    where: { id: pending.userId },
    data: { passwordHash }
  });
  
  pendingOtp.delete(body.challengeId);
  return sendJson(res, 200, { message: "Password updated successfully." });
}

    return sendJson(res, 404, { error: "API route not found." });
  } catch (error) {
    console.error("API Error:", error);
    return sendJson(res, 500, { error: "Internal server error." });
  }
}

const server = http.createServer((req, res) => {
  if ((req.url || "").startsWith("/api/")) return handleApi(req, res);

  const url = getRequestUrl(req);
  if (url.pathname === "/admin") {
    return serveStatic({ ...req, url: "/admin.html" }, res);
  }

  return serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`School portal running at http://localhost:${PORT}`);
});