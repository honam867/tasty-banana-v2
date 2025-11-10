import { promptTemplates } from "../schema.js";

export async function seedPromptTemplates(db) {
  const templates = [
    // Text-to-Image & Single Reference Templates
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
    
    // Multiple Reference Templates
    {
      name: "Fashion Styling (Multiple Ref)",
      prompt: `Transform the target subject by applying fashion elements from the reference images.

Instructions:
- Preserve the target's identity, facial features, and body proportions
- Apply clothing, accessories, and styling from reference images
- Maintain realistic fit and proportions
- Professional fashion photography quality
- Natural lighting and realistic textures
- Seamless integration of all elements`,
      previewUrl: null,
      isActive: true,
    },
    {
      name: "Product Customization (Multiple Ref)",
      prompt: `Enhance the target product by adding features or elements from the reference images.

Instructions:
- Keep the main product structure and identity intact
- Add accessories, features, or design elements from references
- Maintain product quality and commercial appearance
- Professional product photography standards
- Realistic integration of all elements
- E-commerce ready quality`,
      previewUrl: null,
      isActive: true,
    },
    {
      name: "Scene Composition (Multiple Ref)",
      prompt: `Combine the target subject with elements from reference images into a cohesive scene.

Instructions:
- Keep target subject as the main focus
- Integrate background, props, or elements from references
- Create natural, realistic composition
- Professional photography quality
- Consistent lighting and atmosphere across all elements
- Believable and attractive final result`,
      previewUrl: null,
      isActive: true,
    },
    {
      name: "Accessory Addition (Multiple Ref)",
      prompt: `Add accessories or complementary items from reference images to the target.

Instructions:
- Preserve the target subject completely
- Add accessories, items, or elements from references naturally
- Realistic placement and proportions
- Professional quality integration
- Natural lighting and shadows
- Commercially appealing result`,
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
