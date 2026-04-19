import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import app from "./app.js";
import { env } from "./config/env.js";
import { User } from "./models/user.model.js";

const DEFAULT_SUPER_ADMIN_USERNAME = "music_share_super_admin";
const DEFAULT_SUPER_ADMIN_PASSWORD = "music_share_super_admin";
const DEFAULT_SUPER_ADMIN_EMAIL = "music_share_super_admin@local.test";

function printMongoTroubleshooting(error) {
  const message = String(error?.message || "");
  const code = error?.code;

  console.error("Failed to connect MongoDB via Mongoose.");
  console.error(`MONGODB_URI: ${env.mongodbUri}`);

  if (code === "ECONNREFUSED" || message.includes("ECONNREFUSED") || message.includes("Server selection timed out")) {
    console.error("Possible cause: local MongoDB is not running.");
    console.error("Try: start MongoDB service, then restart backend.");
    console.error("Windows check command: mongosh --eval \"db.adminCommand({ ping: 1 })\"");
    return;
  }

  console.error("MongoDB connection error details:", error);
}

async function ensureDefaultSuperAdmin() {
  const existing = await User.findOne({ username: DEFAULT_SUPER_ADMIN_USERNAME }).lean();
  if (existing) {
    return;
  }

  // Keep startup idempotent: create account only when missing.
  let emailToUse = DEFAULT_SUPER_ADMIN_EMAIL;
  const existingEmail = await User.findOne({ email: emailToUse }).lean();
  if (existingEmail) {
    emailToUse = `${DEFAULT_SUPER_ADMIN_USERNAME}+${Date.now()}@local.test`;
  }

  const passwordHash = await bcrypt.hash(DEFAULT_SUPER_ADMIN_PASSWORD, 10);

  await User.create({
    username: DEFAULT_SUPER_ADMIN_USERNAME,
    email: emailToUse,
    passwordHash,
    role: "SUPER_ADMIN",
    displayName: "Music Share Super Admin",
    isActive: true
  });

  console.log(`Default SUPER_ADMIN account created: ${DEFAULT_SUPER_ADMIN_USERNAME}`);
}

async function startServer() {
  try {
    await mongoose.connect(env.mongodbUri, {
      serverSelectionTimeoutMS: 5000
    });

    await ensureDefaultSuperAdmin();

    app.listen(env.port, () => {
      console.log(`Backend listening on http://localhost:${env.port}`);
    });
  } catch (error) {
    printMongoTroubleshooting(error);
    process.exit(1);
  }
}

startServer();
