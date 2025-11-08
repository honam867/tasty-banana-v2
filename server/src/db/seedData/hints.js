import { hints } from "../schema.js";

export async function seedHints(db, templateIds) {
  const hintData = [
    // Text-to-Image hints
    {
      name: "Wasteland Style",
      type: "text_to_image",
      description: "Post-apocalyptic wasteland scenes with dramatic lighting",
      promptTemplateIds: [],
      isActive: true,
    },
    {
      name: "Grotesque Reality",
      type: "text_to_image",
      description: "Dark and surreal grotesque imagery",
      promptTemplateIds: [],
      isActive: true,
    },
    {
      name: "Manor Escape",
      type: "text_to_image",
      description: "Gothic manor scenes with mysterious atmosphere",
      promptTemplateIds: [],
      isActive: true,
    },
    {
      name: "Cyberpunk City",
      type: "text_to_image",
      description: "Futuristic neon-lit cyberpunk cityscape",
      promptTemplateIds: [templateIds.cyberpunkNeon].filter(Boolean),
      isActive: true,
    },
    {
      name: "Fantasy Landscape",
      type: "text_to_image",
      description: "Magical fantasy world with ethereal lighting",
      promptTemplateIds: [],
      isActive: true,
    },
    {
      name: "Cinematic Portrait",
      type: "text_to_image",
      description: "Professional cinematic portrait with dramatic lighting",
      promptTemplateIds: [templateIds.cinematicPortrait].filter(Boolean),
      isActive: true,
    },
    {
      name: "Watercolor Art",
      type: "text_to_image",
      description: "Soft watercolor artistic style",
      promptTemplateIds: [templateIds.watercolorArtistic].filter(Boolean),
      isActive: true,
    },
    {
      name: "3D Isometric",
      type: "text_to_image",
      description: "Modern 3D isometric illustration",
      promptTemplateIds: [templateIds.isometric3D].filter(Boolean),
      isActive: true,
    },
    // Legacy hints (other types)
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
