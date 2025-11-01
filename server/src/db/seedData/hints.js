import { hints } from "../schema.js";

export async function seedHints(db, templateIds) {
  const hintData = [
    {
      name: "Professional Portrait",
      type: "subject",
      description: "Create stunning professional portraits with cinematic quality",
      promptTemplateIds: [templateIds.cinematicPortrait].filter(Boolean),
      isActive: true,
    },
    {
      name: "Product Photography",
      type: "object",
      description: "Clean and professional product shots for e-commerce",
      promptTemplateIds: [templateIds.minimalistProduct].filter(Boolean),
      isActive: true,
    },
    {
      name: "Futuristic Scene",
      type: "scene",
      description: "Cyberpunk and neon-lit futuristic environments",
      promptTemplateIds: [templateIds.cyberpunkNeon].filter(Boolean),
      isActive: true,
    },
    {
      name: "Artistic Style",
      type: "style",
      description: "Watercolor and hand-painted artistic effects",
      promptTemplateIds: [templateIds.watercolorArtistic].filter(Boolean),
      isActive: true,
    },
    {
      name: "3D Illustration",
      type: "style",
      description: "Modern isometric 3D illustrations",
      promptTemplateIds: [templateIds.isometric3D].filter(Boolean),
      isActive: true,
    },
  ];

  for (const hint of hintData) {
    await db
      .insert(hints)
      .values(hint)
      .onConflictDoNothing();
    console.log(`  ✓ Hint: ${hint.name} (${hint.type})`);
  }
}
