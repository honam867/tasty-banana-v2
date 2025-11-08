'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Sparkles, Clock, User, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import TokenBalance from './TokenBalance';
import { useAuth } from '@/contexts/AuthContext';
import Dropdown from '@/components/Dropdown';
import {
  DropdownMenu,
  DropdownMenuHeader,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/DropdownMenu';

interface NavItem {
  id: string;
  label: string;
  icon: typeof Sparkles;
  path: string;
  matchPaths?: string[]; // Additional paths that should mark this item as active
  disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'image',
    label: 'Image',
    icon: Sparkles,
    path: '/studio/text-to-image',
    // This item includes these child routes
    matchPaths: ['/studio/text-to-image', '/studio/image-reference', '/studio/style-transfer'],
  },
  {
    id: 'history',
    label: 'History',
    icon: Clock,
    path: '/studio/history',
    disabled: true, // Building
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [showDesktopDropdown, setShowDesktopDropdown] = useState(false);
  const [showMobileDropdown, setShowMobileDropdown] = useState(false);

  const handleLogout = () => {
    setShowDesktopDropdown(false);
    setShowMobileDropdown(false);
    logout();
    router.push('/login');
  };

  const isActive = (item: NavItem) => {
    if (!pathname) return false;
    
    // Check if current path matches the main path
    if (pathname === item.path || pathname.startsWith(item.path)) {
      return true;
    }
    
    // Check if current path matches any of the child paths (for items with multiple tabs)
    if (item.matchPaths) {
      return item.matchPaths.some(matchPath => 
        pathname === matchPath || pathname.startsWith(matchPath)
      );
    }
    
    return false;
  };

  const handleNavClick = (item: NavItem) => {
    if (item.disabled) return;
    router.push(item.path);
  };

  return (
    <>
      {/* Desktop Sidebar - Fixed Left */}
      <aside className="hidden md:flex flex-col w-20 border-r border-white/10 bg-black/40 backdrop-blur-xl">
        {/* Navigation Items - Centered Vertically */}
        <nav className="flex-1 flex flex-col items-center justify-center space-y-4 py-8">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);

            return (
              <motion.button
                key={item.id}
                onClick={() => handleNavClick(item)}
                disabled={item.disabled}
                className={`
                  relative group flex flex-col items-center justify-center
                  w-12 h-12 lg:w-14 lg:h-14 rounded-xl
                  transition-all duration-300
                  ${active 
                    ? 'bg-[var(--banana-gold)]/10 border-2 border-[var(--banana-gold)]' 
                    : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
                  }
                  ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                whileHover={!item.disabled ? { scale: 1.05 } : {}}
                whileTap={!item.disabled ? { scale: 0.95 } : {}}
                title={item.label}
              >
                <Icon 
                  className={`w-5 h-5 lg:w-6 lg:h-6 transition-colors ${
                    active ? 'text-[var(--banana-gold)]' : 'text-white/60 group-hover:text-white'
                  }`}
                />
                {active && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-[var(--banana-gold)] rounded-r-full"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Bottom Section - Avatar + Token Balance */}
        <div className="flex flex-col items-center space-y-3 p-4 border-t border-white/10">
          <TokenBalance />
          
          {/* User Avatar with Dropdown - Desktop */}
          <Dropdown
            isOpen={showDesktopDropdown}
            onClose={() => setShowDesktopDropdown(false)}
            align="center"
            trigger={
              <button
                onClick={() => setShowDesktopDropdown(!showDesktopDropdown)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[var(--banana-gold)] to-orange-500 border-2 border-white/20 hover:scale-110 transition-transform cursor-pointer"
              >
                {user?.username ? (
                  <span className="text-sm font-bold text-black uppercase">
                    {user.username.charAt(0)}
                  </span>
                ) : (
                  <User className="w-5 h-5 text-black" />
                )}
              </button>
            }
          >
            <DropdownMenu>
              <DropdownMenuHeader>
                <p className="text-xs text-white/60">Signed in as</p>
                <p className="text-sm font-semibold text-white truncate">
                  {user?.email}
                </p>
              </DropdownMenuHeader>

              <DropdownMenuContent>
                <DropdownMenuItem
                  icon={<LogOut className="w-4 h-4" />}
                  label="Sign Out"
                  onClick={handleLogout}
                  variant="danger"
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </Dropdown>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/90 backdrop-blur-xl">
        <nav className="flex items-center justify-around px-4 py-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                disabled={item.disabled}
                className={`
                  relative flex flex-col items-center space-y-1 px-4 py-2 rounded-lg
                  transition-all duration-300
                  ${active ? 'bg-[var(--banana-gold)]/10' : ''}
                  ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <Icon 
                  className={`w-5 h-5 ${
                    active ? 'text-[var(--banana-gold)]' : 'text-white/60'
                  }`}
                />
                <span className={`text-xs ${
                  active ? 'text-[var(--banana-gold)]' : 'text-white/60'
                }`}>
                  {item.label}
                </span>
                {active && (
                  <motion.div
                    layoutId="mobileActiveIndicator"
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-[var(--banana-gold)] rounded-b-full"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
          
          {/* Mobile Token + Avatar with Dropdown */}
          <div className="flex flex-col items-center space-y-1">
            <Dropdown
              isOpen={showMobileDropdown}
              onClose={() => setShowMobileDropdown(false)}
              align="right"
              trigger={
                <button
                  onClick={() => setShowMobileDropdown(!showMobileDropdown)}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-[var(--banana-gold)] to-orange-500 border-2 border-white/20"
                >
                  {user?.username ? (
                    <span className="text-xs font-bold text-black uppercase">
                      {user.username.charAt(0)}
                    </span>
                  ) : (
                    <User className="w-4 h-4 text-black" />
                  )}
                </button>
              }
            >
              <DropdownMenu>
                <DropdownMenuHeader>
                  <p className="text-xs text-white/60">Signed in as</p>
                  <p className="text-sm font-semibold text-white truncate">
                    {user?.email}
                  </p>
                </DropdownMenuHeader>

                <DropdownMenuContent>
                  <DropdownMenuItem
                    icon={<LogOut className="w-4 h-4" />}
                    label="Sign Out"
                    onClick={handleLogout}
                    variant="danger"
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            </Dropdown>
            <TokenBalance />
          </div>
        </nav>
      </div>
    </>
  );
}
