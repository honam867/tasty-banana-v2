import { styleLibrary } from "../schema.js";

export async function seedStyleLibrary(db, templateIds) {
  const styles = [
    {
      name: "Realistic",
      description: "Professional, photorealistic styles for commercial use",
      promptTemplateIds: [
        templateIds.cinematicPortrait,
        templateIds.minimalistProduct,
      ].filter(Boolean),
      isActive: true,
    },
    {
      name: "Artistic",
      description: "Creative and artistic interpretations",
      promptTemplateIds: [
        templateIds.watercolorArtistic,
        templateIds.cyberpunkNeon,
      ].filter(Boolean),
      isActive: true,
    },
    {
      name: "Digital",
      description: "Modern digital art and 3D styles",
      promptTemplateIds: [
        templateIds.isometric3D,
        templateIds.cyberpunkNeon,
      ].filter(Boolean),
      isActive: true,
    },
  ];

  for (const style of styles) {
    await db
      .insert(styleLibrary)
      .values(style)
      .onConflictDoNothing();
    console.log(`  ✓ Style: ${style.name} (${style.promptTemplateIds.length} templates)`);
  }
}
