import { db } from "./drizzle.js";
import { tokenPricing } from "./schema.js";

console.log("📦 seedTokenPricing.js loaded");

/**
 * Seed default token pricing for MVP
 * Run this after initial migration
 */
async function seedTokenPricing() {
  console.log("🚀 Starting token pricing seed...");
  
  const defaultPricing = [
    {
      operationType: "text_to_image",
      tokensPerOperation: 100,
      description:
        "Generate new image from text description (Gemini Flash 2.5 Image)",
      isActive: true,
    },
    {
      operationType: "image_edit_simple",
      tokensPerOperation: 100,
      description:
        "Simple image editing: remove background, change colors, add text, basic transformations",
      isActive: true,
    },
    {
      operationType: "image_edit_complex",
      tokensPerOperation: 150,
      description:
        "Complex editing: multiple changes, flip + background change, detailed modifications",
      isActive: true,
    },
    {
      operationType: "multi_image_composition",
      tokensPerOperation: 200,
      description:
        "Combine multiple images into one scene, composite products together",
      isActive: true,
    },
    {
      operationType: "style_transfer",
      tokensPerOperation: 150,
      description:
        "Apply artistic style from one image to another while preserving content",
      isActive: true,
    },
    {
      operationType: "conversational_edit",
      tokensPerOperation: 100,
      description:
        "Continue editing in conversation: iterative refinements and adjustments",
      isActive: true,
    },
    {
      operationType: "text_rendering",
      tokensPerOperation: 100,
      description:
        "Generate images with high-fidelity text: logos, posters, diagrams with accurate spelling",
      isActive: true,
    },
    {
      operationType: "custom_prompt",
      tokensPerOperation: 100,
      description: "Advanced: User writes custom prompt for maximum control",
      isActive: true,
    },
    {
      operationType: "video_generation",
      tokensPerOperation: 500,
      description:
        "Generate product video using Veo (future feature - coming soon)",
      isActive: false, // Not active yet
    },
  ];

  try {
    console.log("Seeding token pricing...");

    for (const pricing of defaultPricing) {
      await db.insert(tokenPricing).values(pricing).onConflictDoNothing();
      console.log(`✓ Added pricing for: ${pricing.operationType}`);
    }

    console.log("\n✅ Token pricing seeded successfully!");
    console.log("\n📊 Pricing Summary (Gemini Flash 2.5 Image):");
    console.log("- Text-to-Image: 100 tokens");
    console.log("- Simple Image Edit: 100 tokens");
    console.log("- Complex Image Edit: 150 tokens");
    console.log("- Multi-Image Composition: 200 tokens");
    console.log("- Style Transfer: 150 tokens");
    console.log("- Conversational Edit: 100 tokens per iteration");
    console.log("\n🎁 1,000 free tokens = 6-10 image operations");
    console.log("💰 Cost per image: ~$0.05-0.08 (Gemini API cost: ~$0.04)");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding token pricing:", error);
    process.exit(1);
  }
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` ||
                     import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));

if (isMainModule) {
  console.log("✅ Module detection passed, calling seedTokenPricing()");
  seedTokenPricing();
} else {
  console.log("❌ Module detection failed, not calling seedTokenPricing()");
}

export default seedTokenPricing;
