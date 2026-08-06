// seed.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const crypto = require("crypto");
const prisma = new PrismaClient();

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function main() {
  console.log("Seeding database...");
  
  await prisma.user.create({
    data: {
      role: "admin",
      name: "School Admin",
      email: "admin@rbps.test",
      phone: "+919876543210",
      passwordHash: hashPassword("Admin@123"),
      twoFactor: true,
    }
  });

  await prisma.user.create({
    data: {
      role: "parent",
      name: "Priya Mehta",
      email: "parent@rbps.test",
      phone: "+919876543213",
      passwordHash: hashPassword("Parent@123"),
      twoFactor: true,
      children: ["RBPS-2026-0001"],
    }
  });

  console.log("Database seeded successfully!");
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());