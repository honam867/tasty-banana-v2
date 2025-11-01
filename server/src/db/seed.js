import { db } from "./drizzle.js";
import { seedAdmin } from "./seedData/admin.js";
import { seedOperations } from "./seedData/operations.js";
import { seedPromptTemplates } from "./seedData/promptTemplates.js";
import { seedStyleLibrary } from "./seedData/styleLibrary.js";
import { seedHints } from "./seedData/hints.js";
import logger from "../config/logger.js";

/**
 * Main seed function - runs all seeders in order
 */
async function runSeed() {
  console.log("🌱 Starting database seeding...\n");

  try {
    // 1. Seed admin user
    console.log("👤 Seeding admin user...");
    await seedAdmin(db);
    console.log("✓ Admin user seeded\n");

    // 2. Seed operation types
    console.log("⚙️  Seeding operation types...");
    await seedOperations(db);
    console.log("✓ Operation types seeded\n");

    // 3. Seed prompt templates (returns IDs for relationships)
    console.log("🎨 Seeding prompt templates...");
    const templateIds = await seedPromptTemplates(db);
    console.log("✓ Prompt templates seeded\n");

    // 4. Seed style library (uses template IDs)
    console.log("📚 Seeding style library...");
    await seedStyleLibrary(db, templateIds);
    console.log("✓ Style library seeded\n");

    // 5. Seed hints (uses template IDs)
    console.log("💡 Seeding hints...");
    await seedHints(db, templateIds);
    console.log("✓ Hints seeded\n");

    console.log("✅ All seeds completed successfully!");
    console.log("\n📊 Summary:");
    console.log("- Admin user: admin / Password@123!");
    console.log("- Operation types: 2 (text_to_image, image_reference)");
    console.log("- Prompt templates: 5 trending styles");
    console.log("- Style library: 3 categories");
    console.log("- Hints: 5 simple suggestions");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    logger.error("Seed error:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || 
    import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` ||
    import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  runSeed();
}

export default runSeed;
