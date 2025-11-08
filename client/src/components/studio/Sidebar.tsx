'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Sparkles, Clock, User, LogOut, Menu, X } from 'lucide-react';
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
  matchPaths?: string[];
  disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'image',
    label: 'Image',
    icon: Sparkles,
    path: '/studio/text-to-image',
    matchPaths: ['/studio/text-to-image', '/studio/image-reference', '/studio/style-transfer'],
  },
  {
    id: 'history',
    label: 'History',
    icon: Clock,
    path: '/studio/history',
    disabled: true,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [showDesktopDropdown, setShowDesktopDropdown] = useState(false);
  const [showMobileDropdown, setShowMobileDropdown] = useState(false);
  const [showMobilePanel, setShowMobilePanel] = useState(false);

  const handleLogout = () => {
    setShowDesktopDropdown(false);
    setShowMobileDropdown(false);
    setShowMobilePanel(false);
    logout();
    router.push('/login');
  };

  const isActive = (item: NavItem) => {
    if (!pathname) return false;
    if (pathname === item.path || pathname.startsWith(item.path)) return true;
    if (item.matchPaths) {
      return item.matchPaths.some((match) => pathname === match || pathname.startsWith(match));
    }
    return false;
  };

  const handleNavClick = (item: NavItem) => {
    if (item.disabled) return;
    router.push(item.path);
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-20 border-r border-white/10 bg-black/40 backdrop-blur-xl">
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
                  w-12 h-12 lg:w-14 lg:h-14 rounded-xl border
                  transition-all duration-300
                  ${
                    active
                      ? 'bg-[var(--banana-gold)]/10 border-[var(--banana-gold)]'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                  }
                  ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                whileHover={!item.disabled ? { scale: 1.05 } : {}}
                whileTap={!item.disabled ? { scale: 0.95 } : {}}
                title={item.label}
              >
                <Icon
                  className={`w-5 h-5 lg:w-6 lg:h-6 transition-colors ${
                    active ? 'text-[var(--banana-gold)]' : 'text-white/70 group-hover:text-white'
                  }`}
                />
                {active && (
                  <motion.div
                    layoutId="desktopNavIndicator"
                    className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-[var(--banana-gold)] rounded-r-full"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </nav>

        <div className="flex flex-col items-center space-y-3 p-4 border-t border-white/10">
          <TokenBalance />
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
                <p className="text-sm font-semibold text-white truncate">{user?.email}</p>
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

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 border-b border-white/10 bg-black/85 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => setShowMobilePanel(true)}
            className="w-10 h-10 rounded-xl border border-white/15 bg-white/5 flex items-center justify-center text-white"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="text-sm font-semibold text-white tracking-wide">Studio</div>

          <div className="flex items-center gap-2">
            <div className="hidden xs:block scale-90 origin-right">
              <TokenBalance />
            </div>
            <Dropdown
              isOpen={showMobileDropdown}
              onClose={() => setShowMobileDropdown(false)}
              align="right"
              trigger={
                <button
                  onClick={() => setShowMobileDropdown(!showMobileDropdown)}
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-[var(--banana-gold)] to-orange-500 border-2 border-white/20"
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
                  <p className="text-sm font-semibold text-white truncate">{user?.email}</p>
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
        </div>
      </div>

      {/* Mobile slide-out navigation */}
      <div
        className={`md:hidden fixed inset-0 z-50 transition-opacity ${
          showMobilePanel ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowMobilePanel(false)}
        />
        <div
          className={`absolute top-0 bottom-0 left-0 w-72 max-w-[80%] bg-gray-900 border-r border-white/10 shadow-2xl transform transition-transform duration-300 ${
            showMobilePanel ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
            <div>
              <p className="text-sm font-semibold text-white">Navigation</p>
              <p className="text-xs text-white/50">Jump between studio tools</p>
            </div>
            <button
              type="button"
              onClick={() => setShowMobilePanel(false)}
              className="w-9 h-9 rounded-full bg-white/5 border border-white/10 text-white flex items-center justify-center"
              aria-label="Close navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="p-4 space-y-2 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    handleNavClick(item);
                    setShowMobilePanel(false);
                  }}
                  disabled={item.disabled}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all ${
                    active
                      ? 'bg-[var(--banana-gold)]/15 border-[var(--banana-gold)]/50 text-[var(--banana-gold)]'
                      : 'border-white/5 bg-white/5 text-white/70 hover:bg-white/10 hover:border-white/15'
                  } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-semibold">{item.label}</span>
                  {item.disabled && (
                    <span className="ml-auto text-[11px] uppercase tracking-wide text-white/40">
                      Soon
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-white/10 p-4 space-y-3">
            <TokenBalance />
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white/80 bg-white/5 border border-white/10 rounded-2xl py-2.5 hover:bg-white/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
