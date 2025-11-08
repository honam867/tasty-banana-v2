"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Image as ImageIcon, Wand2 } from "lucide-react";

interface Tab {
  id: string;
  label: string;
  icon: typeof Sparkles;
  path: string;
}

const TABS: Tab[] = [
  {
    id: "text-to-image",
    label: "Text to Image",
    icon: Sparkles,
    path: "/studio/text-to-image",
  },
  {
    id: "image-reference",
    label: "Image Reference",
    icon: ImageIcon,
    path: "/studio/image-reference",
  },
  {
    id: "style-transfer",
    label: "Style Transfer",
    icon: Wand2,
    path: "/studio/style-transfer",
  },
];

export default function TabNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) => {
    // Check if current pathname matches the tab path
    if (!pathname) return false;
    return pathname === path || pathname.startsWith(path);
  };

  return (
    <div className="flex-shrink-0 border-b border-white/10 bg-black/20 backdrop-blur-sm">
      <nav className="flex items-center space-x-1 px-4 overflow-x-auto scrollbar-hide h-14">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);

          return (
            <button
              key={tab.id}
              onClick={() => {
                router.push(tab.path);
              }}
              className={`
                relative flex items-center space-x-2 px-4 h-full
                whitespace-nowrap transition-all duration-300 z-10
                ${
                  active
                    ? "text-[var(--banana-gold)] font-semibold"
                    : "text-white/60 hover:text-white"
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium text-sm">{tab.label}</span>

              {/* Active Indicator */}
              {active && (
                <motion.div
                  layoutId="tabActiveIndicator"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--banana-gold)] z-20"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
