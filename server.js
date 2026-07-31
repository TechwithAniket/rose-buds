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

const sessions = new Map();
const pendingOtp = new Map();
const pendingOtpDelivery = new Map();

// Keeping static school info in memory since it rarely changes
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

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function dispatchSMS(phone, otpCode) {
  try {
    console.log(`[DEV MODE] Mock dispatching SMS to ${phone} with OTP: ${otpCode}`);
    return true;
  } catch (error) {
    console.error("Failed to send SMS:", error);
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

function getSession(req) {
  const token = parseCookies(req).session;
  if (!token) return null;
  return sessions.get(token) || null;
}

function requireUser(req, res, roles) {
  const session = getSession(req);
  if (!session) {
    sendJson(res, 401, { error: "Please login first." });
    return null;
  }
  if (roles && !roles.includes(session.role)) {
    sendJson(res, 403, { error: "You do not have permission for this action." });
    return null;
  }
  return session;
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

async function handleApi(req, res) {
  const url = getRequestUrl(req);
  const route = `${req.method} ${url.pathname}`;

  try {
    if (route === "POST /api/login") {
      const body = await readBody(req);
      const email = String(body.email || "").toLowerCase();

      const user = await prisma.user.findUnique({
        where: { email: email }
      });

    const isValidPassword = await bcrypt.compare(String(body.password || ""), user.passwordHash);

if (!user || !isValidPassword) {
  return sendJson(res, 401, { error: "Invalid email or password." });
}

      if (user.twoFactor) {
        const challengeId = crypto.randomUUID();
        pendingOtpDelivery.set(challengeId, {
          userId: user.id,
          expiresAt: Date.now() + 5 * 60 * 1000,
        });
        return sendJson(res, 200, {
          requiresOtp: true,
          challengeId,
          phone: user.phone,
          expiresInMinutes: 5,
        });
      }

      const token = crypto.randomUUID();
      sessions.set(token, { userId: user.id, role: user.role });
      
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Set-Cookie": `session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/`,
      });
      return res.end(JSON.stringify({ user: publicUser(user) }));
    }

    if (route === "POST /api/request-otp") {
      const body = await readBody(req);
      const pending = pendingOtpDelivery.get(body.challengeId);

      if (!pending || pending.expiresAt < Date.now()) {
        return sendJson(res, 401, { error: "OTP request expired. Please login again." });
      }

      const user = await prisma.user.findUnique({ where: { id: pending.userId } });
      const smsOtp = String(crypto.randomInt(100000, 999999));

      dispatchSMS(user.phone, smsOtp);

      pendingOtp.set(body.challengeId, {
        userId: pending.userId,
        method: "sms",
        smsOtp,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });
      pendingOtpDelivery.delete(body.challengeId);

      return sendJson(res, 200, {
        method: "sms",
        delivery: `OTP has been dispatched to ${user.phone}`,
        expiresInMinutes: 5,
      });
    }

    if (route === "POST /api/verify-otp") {
      const body = await readBody(req);
      const challenge = pendingOtp.get(body.challengeId);
      const smsOtpMatches = challenge?.smsOtp === String(body.smsOtp || "");
      if (!challenge || challenge.expiresAt < Date.now() || !smsOtpMatches) {
        return sendJson(res, 401, { error: "Invalid or expired OTP." });
      }

      const user = await prisma.user.findUnique({ where: { id: challenge.userId } });
      pendingOtp.delete(body.challengeId);
      
      const token = crypto.randomUUID();
      sessions.set(token, { userId: user.id, role: user.role });
   
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Set-Cookie": `session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/`,
      });
      return res.end(JSON.stringify({ user: publicUser(user) }));
    }

    if (route === "POST /api/logout") {
      const token = parseCookies(req).session;
      if (token) sessions.delete(token);
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Set-Cookie": "session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
      });
      return res.end(JSON.stringify({ ok: true }));
    }

    if (route === "GET /api/me") {
      const session = getSession(req);
      if (!session || !session.userId) {
        return sendJson(res, 200, { user: null });
      }
      
      const user = await prisma.user.findUnique({ where: { id: session.userId } });
      if (!user) return sendJson(res, 200, { user: null });
      
      return sendJson(res, 200, { user: publicUser(user) });
    }

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

        // Inside your rescue route...
const secureHash = await bcrypt.hash("admin123", 10); // 10 is the salt rounds

const admin = await prisma.user.create({
  data: {
    // ... other fields
    passwordHash: secureHash, 
  }
});

        const admin = await prisma.user.create({
          data: {
            name: "Super Admin",
            email: "admin@test.com",
            passwordHash: hashPassword("admin123"), // <-- Using YOUR app's hash!
            role: "admin",
            phone: "1234567890"
          }
        });
        
        return sendJson(res, 200, { message: "Admin revived with PERFECT password!" });
      } catch (error) {
        return sendJson(res, 500, { error: error.message });
      }
    }
    if (route === "GET /api/dashboard") {
      const session = requireUser(req, res);
      if (!session) return;

      const user = await prisma.user.findUnique({ where: { id: session.userId } });
      if (!user) return sendJson(res, 401, { error: "User session invalid." });

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
      const session = requireUser(req, res, ["admin"]);
      if (!session) return;
      const body = await readBody(req);
      defaultDb.school = { ...defaultDb.school, ...body };
      return sendJson(res, 200, { school: defaultDb.school });
    }

    if (route === "POST /api/students") {
      const session = requireUser(req, res, ["admin"]);
      if (!session) return;
      const body = await readBody(req);

      const password = body.studentPassword;
      const parentPassword = body.parentPassword;

      if (!password || !parentPassword) {
        return sendJson(res, 400, { error: "Student and Parent passwords must be explicitly set." });
      }
      const studentId = await getNextStudentId();

      const studentUser = await prisma.user.create({
        data: {
          role: "student",
          name: body.name,
          email: body.studentEmail,
          phone: body.studentPhone,
          passwordHash: hashPassword(password),
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
          passwordHash: hashPassword(parentPassword),
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
      const session = requireUser(req, res, ["admin"]);
      if (!session) return;
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
      const session = requireUser(req, res, ["parent"]);
      if (!session) return;
      const body = await readBody(req);
      
      const parent = await prisma.user.findUnique({ where: { id: session.userId } });
      if (!parent.children.includes(body.studentId)) {
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
        parentName: parent.name,
        parentPhone: parent.phone,
        parentEmail: parent.email,
        demoMode: !process.env.RAZORPAY_KEY_ID,
      });
    }

    if (route === "PATCH /api/students") {
      const session = requireUser(req, res, ["admin"]);
      if (!session) return;
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
      console.log("--- 1. DELETE ROUTE TRIGGERED ---");
      
      try {
        // Step 1: Read the network stream
        const buffers = [];
        for await (const chunk of req) {
          buffers.push(chunk);
        }
        const rawData = Buffer.concat(buffers).toString();
        console.log("--- 2. RAW NETWORK DATA ---", rawData);
        
        const body = JSON.parse(rawData || "{}");
        const { studentId } = body;
        console.log("--- 3. EXTRACTED ID ---", studentId);

        // Step 2: Find the student
        const student = await prisma.student.findUnique({
          where: { studentId: String(studentId) }
        });

        if (!student) {
          console.log("--- 4. FAILURE: STUDENT NOT FOUND IN DB ---");
          return sendJson(res, 404, { error: "Student not found in database." });
        }

        console.log("--- 5. STUDENT FOUND. WIPING PAYMENTS... ---");
        await prisma.payment.deleteMany({
          where: { studentId: String(studentId) }
        });

        console.log("--- 6. WIPING STUDENT RECORD... ---");
        await prisma.student.delete({
          where: { studentId: String(studentId) }
        });

        console.log("--- 7. WIPING LOGIN ACCOUNTS... ---");
        const usersToDelete = [];
        
        // Grab the actual user IDs from your schema
        if (student.studentUserId) usersToDelete.push(student.studentUserId);
        if (student.parentUserId) usersToDelete.push(student.parentUserId);

        if (usersToDelete.length > 0) {
          await prisma.user.deleteMany({
            where: {
              id: { in: usersToDelete }
            }
          });
        }
        

        console.log("--- 8. SUCCESS: EVERYTHING DELETED ---");
        return sendJson(res, 200, { message: "Student completely wiped." });

      } catch (error) {
        console.error("--- CRASH IN DELETE ROUTE ---", error);
        return sendJson(res, 500, { error: "Server crashed during delete." });
      }
    }

    if (route === "POST /api/payments") {
      const session = requireUser(req, res, ["parent"]);
      if (!session) return;
      const body = await readBody(req);
      
      const parent = await prisma.user.findUnique({ where: { id: session.userId } });
      if (!parent || !parent.children.includes(body.studentId)) {
        return sendJson(res, 403, { error: "You can only pay fees for your own child." });
      }

      const amount = Number(body.amount || 0);
      if (amount <= 0) return sendJson(res, 400, { error: "Payment amount must be greater than zero." });

      const payment = await prisma.$transaction(async (tx) => {
        const newPayment = await tx.payment.create({
          data: {
            studentId: body.studentId,
            amount: amount,
            mode: body.mode || "UPI",
            reference: body.reference || `LOCAL-${Date.now()}`,
            paidByUserId: parent.id,
            status: "success",
            messageSent: true
          }
        });

        const updatedStudent = await tx.student.update({
          where: { studentId: body.studentId },
          data: {
            paidAmount: { increment: amount }
          }
        });

        return { payment: newPayment, student: updatedStudent };
      });

      return sendJson(res, 201, payment);
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