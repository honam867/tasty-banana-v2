import { promptTemplates } from "../schema.js";

export async function seedPromptTemplates(db) {
  const templates = [
    {
      name: "Cinematic Portrait",
      prompt: "Ultra-detailed cinematic portrait, professional studio lighting, shallow depth of field, bokeh background, film grain texture, dramatic mood lighting, high-end fashion photography style, 8K resolution, professional color grading",
      previewUrl: null,
      isActive: true,
    },
    {
      name: "Minimalist Product",
      prompt: "Clean minimalist product photography, pure white background, soft diffused lighting, sharp focus, high detail, professional e-commerce style, floating product, subtle shadow, ultra-clean aesthetic",
      previewUrl: null,
      isActive: true,
    },
    {
      name: "Cyberpunk Neon",
      prompt: "Vibrant cyberpunk aesthetic, neon lights, futuristic cityscape, rain-soaked streets, purple and cyan color palette, blade runner style, atmospheric fog, high contrast lighting, cinematic composition",
      previewUrl: null,
      isActive: true,
    },
    {
      name: "Watercolor Artistic",
      prompt: "Delicate watercolor painting style, soft pastel colors, artistic brush strokes, flowing transitions, dreamy atmosphere, paper texture, hand-painted aesthetic, gentle color bleeds, artistic interpretation",
      previewUrl: null,
      isActive: true,
    },
    {
      name: "3D Isometric",
      prompt: "Clean 3D isometric illustration, vibrant colors, geometric shapes, low-poly aesthetic, playful design, modern tech style, smooth gradients, perfect perspective, digital art composition",
      previewUrl: null,
      isActive: true,
    },
  ];

  const createdTemplates = [];

  for (const template of templates) {
    const [created] = await db
      .insert(promptTemplates)
      .values(template)
      .onConflictDoNothing()
      .returning();
    
    if (created) {
      createdTemplates.push(created);
      console.log(`  ✓ Template: ${template.name}`);
    }
  }

  // Return template IDs mapped by name for relationships
  return {
    cinematicPortrait: createdTemplates[0]?.id,
    minimalistProduct: createdTemplates[1]?.id,
    cyberpunkNeon: createdTemplates[2]?.id,
    watercolorArtistic: createdTemplates[3]?.id,
    isometric3D: createdTemplates[4]?.id,
  };
}
