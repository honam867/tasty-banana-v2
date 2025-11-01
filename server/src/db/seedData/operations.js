import { operationType } from "../schema.js";

export async function seedOperations(db) {
  const operations = [
    {
      name: "text_to_image",
      tokensPerOperation: 100,
      description: "Generate new image from text description (Gemini Flash 2.5 Image)",
      isActive: true,
    },
    {
      name: "image_reference",
      tokensPerOperation: 150,
      description: "Generate image using reference image as input guide",
      isActive: true,
    },
  ];

  for (const op of operations) {
    await db
      .insert(operationType)
      .values(op)
      .onConflictDoNothing();
    console.log(`  ✓ Operation type: ${op.name} (${op.tokensPerOperation} tokens)`);
  }
}
