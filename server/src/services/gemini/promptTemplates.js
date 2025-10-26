/**
 * Prompt Engineering Templates for Gemini Flash 2.5 Image
 * Optimized for e-commerce product photography and commercial use
 */

class PromptTemplates {
  
  /**
   * Text-to-Image Templates
   */
  static textToImage(basePrompt, options = {}) {
    const {
      style = 'product_photography',
      lighting = 'studio',
      background = 'white',
      mood = 'professional'
    } = options;

    const templates = {
      product_photography: `
        Create a professional product photograph of ${basePrompt}.
        
        Photography specifications:
        - High resolution, sharp focus on product
        - Clean, minimalist composition
        - ${lighting} lighting with soft shadows
        - ${background} background
        - Commercial-grade quality
        - Perfect for e-commerce listings
        
        Style: ${mood}, high-end, luxury commercial photography
      `.trim(),
      
      lifestyle: `
        Create a lifestyle photograph featuring ${basePrompt}.
        
        Photography specifications:
        - Natural, authentic settings
        - Context that shows product in use
        - Warm, inviting lighting
        - Realistic scene composition
        - Professional-quality lifestyle photography
        
        Style: Editorial, lifestyle magazine quality
      `.trim(),
      
      creative: `
        Create an artistic and creative interpretation of ${basePrompt}.
        
        Artistic specifications:
        - Creative composition and angles
        - Unique visual perspective
        - Professional artistic quality
        - Maintains product recognition
        - Suitable for marketing campaigns
        
        Style: Creative, artistic, high-end commercial art
      `.trim()
    };

    return templates[style] || templates.product_photography;
  }

  /**
   * Simple Edit Templates
   */
  static simpleEdit(action, details = '') {
    const templates = {
      remove_background: `
        Remove the background from this product image.
        Replace with pure white background (RGB 255,255,255).
        Keep the product exactly as it is, just change the background.
        Ensure clean, professional edges without any halos.
      `.trim(),
      
      flip_horizontal: `
        Flip this image horizontally (mirror the image).
        Keep the product, lighting, and all qualities the same.
        Perfect mirroring without any distortion.
      `.trim(),
      
      flip_vertical: `
        Flip this image vertically.
        Keep all aspects of the image the same except for vertical mirroring.
        Maintain perfect quality and composition.
      `.trim(),
      
      enhance_lighting: `
        Improve the lighting in this product photograph.
        Make it brighter and more evenly lit.
        Add soft studio lighting effect.
        Maintain a natural, professional appearance.
        Don't overexpose or create harsh shadows.
      `.trim(),
      
      center_product: `
        Center this product perfectly in the frame.
        Improve the composition while keeping the product unchanged.
        Balance the frame professionally.
        Maintain all lighting and appearance of the product.
      `.trim(),
      
      add_shadows: `
        Add subtle, professional shadows underneath the product.
        Create depth and dimension with soft, natural shadows.
        Keep shadows realistic and not harsh.
        Maintain studio photography quality.
      `.trim(),
      
      sharpen_details: `
        Sharpen the details and make the image more crisp and clear.
        Enhance overall sharpness while maintaining a natural look.
        Focus on product details and textures.
        Professional enhancement without over-sharpening.
      `.trim(),
      
      enhance_colors: `
        Make the colors in this image more vibrant and professional.
        Enhance color saturation slightly for better appearance.
        Maintain realistic and commercial-quality colors.
        Don't oversaturate or make colors look fake.
      `.trim()
    };

    const baseTemplate = templates[action];
    if (!baseTemplate) {
      throw new Error(`Unknown simple edit action: ${action}`);
    }

    return details ? `${baseTemplate}\n\n${details}` : baseTemplate;
  }

  /**
   * Complex Edit Templates
   */
  static complexEdit(scenario, customDetails = '') {
    const templates = {
      complete_transformation: `
        Transform this product image into professional e-commerce quality:
        
        1. Remove the current background and replace with pure white
        2. Adjust lighting to be bright and evenly distributed
        3. Center the product in the frame
        4. Add subtle professional shadows underneath
        5. Enhance sharpness slightly for clarity
        6. Ensure white balance is correct for commercial use
        
        Final result: Studio-quality product photography suitable for online stores.
      `.trim(),
      
      background_scene_change: `
        Change this product's background with professional quality:
        
        Background requirements:
        - Replace current background with the specified scene
        - Maintain product's lighting and shadows for realism
        - Ensure product integrates naturally with new background
        - Professional commercial quality
        - Keep product as the main focus
        
        ${customDetails ? `Additional details: ${customDetails}` : ''}
      `.trim(),
      
      lighting_enhancement: `
        Professional lighting correction for this product image:
        
        Lighting improvements:
        - Balance exposure across the entire product
        - Remove harsh shadows and bright spots
        - Add soft, professional studio lighting
        - Maintain realistic appearance
        - Enhance product visibility without over-processing
        
        Result: Professional e-commerce photography lighting.
      `.trim(),
      
      color_correction: `
        Professional color correction for this product:
        
        Color adjustments:
        - Correct white balance for accurate colors
        - Ensure colors look natural and appealing
        - Enhance saturation slightly for better appearance
        - Maintain realistic product appearance
        - Professional commercial-grade color quality
      `.trim()
    };

    const baseTemplate = templates[scenario];
    if (!baseTemplate) {
      // If no predefined scenario, treat as custom
      return customDetails || 'Please make the specified professional edits to this product image.';
    }

    return baseTemplate;
  }

  /**
   * Composition Templates
   */
  static composition(scenario, customDetails = '') {
    const templates = {
      product_lifestyle: `
        Create a professional lifestyle scene with the provided products:
        
        Composition requirements:
        - Arrange products naturally in the specified setting
        - Create authentic, realistic scene composition
        - Maintain professional lighting and quality
        - Show products in context of real use
        - Professional e-commerce lifestyle photography
        
        ${customDetails ? `Additional requirements: ${customDetails}` : ''}
      `.trim(),
      
      product_grouping: `
        Create a professional group shot of these products:
        
        Grouping specifications:
        - Arrange products attractively together
        - Professional studio-style lighting
        - Clean background (white or neutral)
        - Show each product clearly
        - Balance and good composition
        - Commercial-quality product group photography
      `.trim(),
      
      scene_creation: `
        Compose these products into a professional commercial scene:
        
        Scene requirements:
        - Create natural, appealing environment
        - Professional lighting and composition
        - Show products in authentic context
        - High-end commercial photography quality
        - Balanced, attractive arrangement
        
        ${customDetails ? `Scene details: ${customDetails}` : ''}
      `.trim()
    };

    const baseTemplate = templates[scenario];
    if (!baseTemplate) {
      return customDetails || 'Please create a professional composition with these products.';
    }

    return baseTemplate;
  }

  /**
   * Style Transfer Templates
   */
  static styleTransfer(scenario, customDetails = '') {
    const templates = {
      artistic_style: `
        Apply the artistic style from the style image to the content image:
        
        Style transfer requirements:
        - Adopt the visual style, color palette, and mood from the style image
        - Keep the subject and form of the content image
        - Maintain product recognition and commercial suitability
        - Professional artistic quality suitable for marketing
        - Balance creativity with product clarity
      `.trim(),
      
      mood_transfer: `
        Transfer the mood and atmosphere while maintaining clarity:
        
        Transfer specifications:
        - Apply the emotional tone and atmosphere from style image
        - Keep the product clearly visible and recognizable
        - Professional commercial quality
        - Suitable for branding and marketing
        - Maintain professional appeal
      `.trim(),
      
      aesthetic_enhancement: `
        Enhance the content image with aesthetic qualities from the style image:
        
        Enhancement goals:
        - Improve visual appeal using style reference
        - Maintain product as the main focus
        - Professional commercial quality
        - Appealing to target customers
        - Suitable for e-commerce and marketing
      `.trim()
    };

    const baseTemplate = templates[scenario];
    if (!baseTemplate) {
      return customDetails || 'Please apply the style from the second image to the first while maintaining product clarity and professional quality.';
    }

    return baseTemplate;
  }

  /**
   * Quick Action Templates (simplified versions)
   */
  static quickAction(action, customPrompt = '') {
    if (customPrompt) {
      return customPrompt;
    }

    const quickTemplates = {
      remove_background: 'Remove background, make it pure white.',
      flip_horizontal: 'Flip horizontally.',
      flip_vertical: 'Flip vertically.',
      enhance_lighting: 'Brighten lighting, make it professional.',
      add_shadows: 'Add soft shadows underneath.',
      center_product: 'Center the product.',
      sharpen_details: 'Sharpen details for clarity.',
      enhance_colors: 'Make colors slightly more vibrant.'
    };

    return quickTemplates[action] || 'Please make professional improvements to this product image.';
  }

  /**
   * Text Rendering Templates
   */
  static textRendering(text, designStyle) {
    const templates = {
      logo_design: `
        Create a professional logo design featuring the text "${text}".
        
        Design specifications:
        - Text must be exactly: "${text}" with correct spelling
        - Clean, professional typography
        - ${designStyle} aesthetic
        - Suitable for commercial use
        - High quality, sharp, clear text
        - Professional branding quality
        
        Ensure the text is perfectly legible and professionally rendered.
      `.trim(),
      
      banner_design: `
        Create a professional promotional banner with the text "${text}".
        
        Banner specifications:
        - Text must be exactly: "${text}" spelled correctly
        - Bold, eye-catching typography
        - ${designStyle} design style
        - Professional commercial quality
        - Perfect for marketing and advertising
        - Clear, readable text with excellent composition
        
        The text must be prominent, clear, and professionally presented.
      `.trim(),
      
      social_media: `
        Design a professional social media post featuring "${text}".
        
        Social media specifications:
        - Text exactly as written: "${text}"
        - ${designStyle} style
        - Optimized for social media platforms
        - Professional, shareable quality
        - Clear, readable typography
        - Engaging visual composition
        
        Ensure perfect legibility and professional appearance.
      `.trim()
    };

    const baseTemplate = templates[designStyle.category] || templates.logo_design;
    return baseTemplate.replace('${designStyle}', designStyle.description || designStyle.style || '');
  }

  /**
   * Product Photography Enhancer
   */
  static enhanceProductPrompt(basePrompt, options = {}) {
    const {
      angle = 'straight_on',
      lighting = 'studio',
      mood = 'professional',
      details = 'high'
    } = options;

    return `
      ${basePrompt}
      
      Photography specifications:
      - High-resolution product photography
      - ${angle} angle shot
      - ${lighting} lighting setup
      - ${mood} commercial quality
      - ${details} level of detail
      - Clean, sharp focus
      - Perfect for e-commerce listings
      - White or neutral background
      - Professional studio quality
      - Retail-ready appearance
    `.trim();
  }

  /**
   * E-commerce Specific Prompts
   */
  static ecommercePrompt(productType, context = '') {
    const baseTemplates = {
      clothing: `
        Professional apparel photography of ${productType}.
        Fashion-forward presentation, clean studio lighting,
        Wrinkle-free, properly sized display.
        Premium fashion retail quality.
      `,
      
      electronics: `
        High-tech product photography of ${productType}.
        Show clean lines and modern design features.
        Sleek, professional presentation with clear details.
        Technical precision and modern aesthetic.
      `,
      
      home_goods: `
        Lifestyle home product photography of ${productType}.
        Domestic, comfortable setting with natural lighting.
        Show product in authentic home context.
        Warm, inviting appearance for household items.
      `,
      
      food_beverage: `
        Appetizing food photography of ${productType}.
        Fresh, appealing presentation with natural ingredients.
        Vibrant colors and fresh appearance.
        Professional food styling, restaurant-quality.
      `,
      
      beauty_cosmetics: `
        Beauty product photography of ${productType}.
        Clean, elegant presentation with premium quality.
        Show packaging and product details clearly.
        Luxury beauty retail presentation.
      `,
      
      general: `
        Professional product photography of ${productType}.
        Clean, commercial-quality presentation.
        Studio lighting with neutral background.
        Retail-ready appearance for online stores.
      `
    };

    const category = context.toLowerCase().includes('clothing') ? 'clothing' :
                     context.toLowerCase().includes('electronic') ? 'electronics' :
                     context.toLowerCase().includes('home') ? 'home_goods' :
                     context.toLowerCase().includes('food') || context.toLowerCase().includes('beverage') ? 'food_beverage' :
                     context.toLowerCase().includes('beauty') || context.toLowerCase().includes('cosmetic') ? 'beauty_cosmetics' :
                     'general';

    return baseTemplates[category].trim();
  }
}

export default PromptTemplates;
