import CryptoJS from "crypto-js";
import { users } from "../schema.js";
import { sql } from "drizzle-orm";
import TokenService from "../../services/tokens/TokenService.js";
import { TOKEN_REASON_CODES, TOKEN_ACTOR_TYPES } from "../../utils/constant.js";

export async function seedAdmin(db) {
  const adminEmail = "admin@tastybanana.com";
  const adminPassword = "Password@123!";
  const adminUsername = "admin";

  // Check if admin already exists
  const existing = await db
    .select()
    .from(users)
    .where(sql`email = ${adminEmail}`)
    .limit(1);

  if (existing.length > 0) {
    console.log("  ⚠️  Admin user already exists, skipping...");
    return existing[0];
  }

  // Encrypt password using same method as auth controller
  const encryptedPassword = CryptoJS.AES.encrypt(
    adminPassword,
    process.env.PASSWORD_SECRET_KEY
  ).toString();

  // Create admin user
  const [admin] = await db
    .insert(users)
    .values({
      username: adminUsername,
      email: adminEmail,
      password: encryptedPassword,
      role: "admin",
      status: "active",
    })
    .returning();

  console.log(`  ✓ Created admin user: ${adminUsername}`);

  // Grant admin 10,000 tokens
  try {
    await TokenService.credit(admin.id, 10000, {
      reasonCode: TOKEN_REASON_CODES.ADMIN_TOPUP,
      idempotencyKey: `admin-seed:${admin.id}`,
      actor: { type: TOKEN_ACTOR_TYPES.SYSTEM },
      metadata: { source: "seed-script" },
    });
    console.log("  ✓ Granted 10,000 tokens to admin");
  } catch (error) {
    console.warn("  ⚠️  Token grant failed (may already exist):", error.message);
  }

  return admin;
}
