# 📝 banana-landing-theme.md

## 🍌 Project: Banana AI Studio
**Type:** Landing Page (Showcase-First)  
**Framework:** ShadeUI + Tailwind CSS  
**Theme:** Dark, cinematic, minimal, futuristic  
**Typography:** `Plus Jakarta Sans`  
**Core Visual Identity:** Liquid Glass + Floating Motion + Soft Glow

---

## 🎨 1. Visual Foundation

### **Base Aesthetic**
> Every component — button, card, icon, input, or tag — follows a *liquid-glass style* inspired by your reference image.

**Core Style Description:**
- Frosted glass material with **translucent white gradient** overlay (`opacity 0.15–0.25`).
- **Rounded corners** (`rounded-2xl` or `rounded-full` for pill shapes).  
- **Thin white border** with **semi-transparent gradient** (`border border-white/20`).  
- **Soft inner glow** along edges.  
- **Subtle shadow** underneath for floating effect.  
- **Backdrop blur** between `blur-[10px]` and `blur-[15px]`.  
- **Glass reflection highlight** with a gentle **shimmer on hover**.  
- **Depth layering** using multiple semi-transparent planes.  

### **Color Palette**
| Role | Value |
|------|--------|
| Background | `#0b0b0f` (deep cinematic night) |
| Accent glow | `rgba(255, 255, 255, 0.1)` |
| Border light | `rgba(255, 255, 255, 0.3)` |
| Text | `#fefefe` |
| Highlight gradient | `linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))` |

---

## 🧩 2. Component Reuse Blueprint

### 🪞 **Base Glass Component**
_All elements extend from this base._

```tsx
<div className="relative backdrop-blur-xl border border-white/20 rounded-2xl bg-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.2)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-[0_6px_35px_rgba(255,255,255,0.15)] hover:after:opacity-100 overflow-hidden after:absolute after:inset-0 after:bg-gradient-to-r after:from-white/10 after:via-white/40 after:to-white/10 after:opacity-0 after:translate-x-[-100%] hover:after:translate-x-[100%] after:transition-all after:duration-700">
  {children}
</div>
```

**Explanation:**
- Uses **pseudo-element shimmer** (the “shining from left to right” effect).  
- Smooth cubic-bezier easing for fluid transitions.  
- Works as a base wrapper for:
  - Buttons  
  - Social icons  
  - Info cards  
  - CTA sections  
  - Showcase tags

---

### 🖱️ **Hover Motion (Shining Effect)**
The shine appears as a **diagonal light sweep** from left to right:
- Implemented via `after` pseudo element.  
- Movement triggered by hover → translateX from -100% to +100%.  
- Duration: 700–900ms  
- Easing: `ease-in-out`

This same motion is reused for all interactive components for visual harmony.

---

### 🧱 **Reusable Components**
All share the `glass-base` core.

| Component | Description |
|------------|--------------|
| **GlassButton** | Pill-shaped CTA (e.g., “Manifesto”, “Start Creating”) |
| **GlassIconButton** | Circular icons (Instagram, X, GitHub) |
| **GlassCard** | For feature highlights and showcase info |
| **GlassTag** | For prompt overlays like “/imagine” |
| **GlassInput** | For future user prompt entry |

**Common Tailwind Layers:**
```css
@layer components {
  .glass {
    @apply backdrop-blur-xl bg-white/10 border border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.2)] rounded-2xl text-white transition-all duration-500 relative overflow-hidden;
  }
  .glass::after {
    content: "";
    @apply absolute inset-0 bg-gradient-to-r from-white/10 via-white/40 to-white/10 opacity-0 -translate-x-full transition-all duration-700 ease-in-out;
  }
  .glass:hover::after {
    @apply opacity-100 translate-x-full;
  }
}
```

---

## 🌌 3. Background Environment (3D Effect)

### **Concept**
- Background gives a **cinematic depth illusion**, not static.  
- Use a **parallax 3D field**: floating light orbs or gradient blobs moving slowly.
- Optionally integrate **react-three-fiber** or **Framer Motion** layers:
  - Floating gradient meshes  
  - Subtle depth parallax on scroll.

### **Simpler CSS Option**
```html
<div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0b0b0f] via-[#0f1016] to-[#0b0b0f] overflow-hidden">
  <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-purple-500/10 blur-[120px] animate-pulse-slow"></div>
  <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-yellow-400/10 blur-[120px] animate-pulse-slow delay-3000"></div>
</div>
```
Adds smooth 3D lighting ambience behind glass UI.

---

## 🧠 4. Motion System
- **Scroll Parallax:** use `Framer Motion`’s `useScroll` + `motion.div` translateY.  
- **Hover Depth:** `scale(1.03)` + shadow glow.  
- **Entrance Fade:** `opacity-0 → opacity-100` with 0.6s delay chain.  
- **Timing:** `cubic-bezier(0.22, 1, 0.36, 1)` across all transitions.  

---

## 🪄 5. Overall Mood Prompt (for AI Agent)
> “Design a dark cinematic landing page for Banana AI Studio using ShadeUI and Tailwind CSS.  
All components follow a reusable liquid-glass theme with soft transparency, blurred background, glowing edges, and a gentle shimmer on hover.  
Use Plus Jakarta Sans. Background has a slow 3D gradient depth effect.  
Focus on elegance, futuristic calmness, and showcase visuals inspired by Midjourney’s layout.”
