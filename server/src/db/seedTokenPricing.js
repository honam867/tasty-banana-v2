import { db } from "./drizzle.js";
import { operationType } from "./schema.js";

console.log("📦 seedOperationType.js loaded");

/**
 * Seed default operation types for MVP
 * Run this after initial migration
 */
async function seedOperationType() {
  console.log("🚀 Starting operation type seed...");
  
  const defaultOperationTypes = [
    {
      name: "text_to_image",
      tokensPerOperation: 100,
      description:
        "Generate new image from text description (Gemini Flash 2.5 Image)",
      isActive: true,
    },
    {
      name: "image_reference",
      tokensPerOperation: 150,
      description:
        "Generate image using reference image as input guide",
      isActive: true,
    },
    {
      name: "image_multiple_reference",
      tokensPerOperation: 200,
      description:
        "Generate image using target + multiple reference images for composition/styling",
      isActive: true,
    },
  ];

  try {
    console.log("Seeding operation types...");

    for (const opType of defaultOperationTypes) {
      await db.insert(operationType).values(opType).onConflictDoNothing();
      console.log(`✓ Added operation type: ${opType.name}`);
    }

    console.log("\n✅ Operation types seeded successfully!");
    console.log("\n📊 Available Operations:");
    console.log("- Text to Image: 100 tokens");
    console.log("- Image Reference: 150 tokens");
    console.log("- Multiple Reference: 200 tokens");
    console.log("\n🎁 1,000 free tokens = 5-10 image operations (depending on operation type)");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding operation types:", error);
    process.exit(1);
  }
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` ||
                     import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));

if (isMainModule) {
  console.log("✅ Module detection passed, calling seedOperationType()");
  seedOperationType();
} else {
  console.log("❌ Module detection failed, not calling seedOperationType()");
}

export default seedOperationType;
