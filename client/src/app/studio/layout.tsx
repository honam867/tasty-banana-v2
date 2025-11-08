'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { GenerationsProvider } from '@/contexts/GenerationsContext';
import Sidebar from '@/components/studio/Sidebar';
import RightPanel from '@/components/studio/RightPanel';
import MobileGenerationsModal from '@/components/studio/MobileGenerationsModal';
import { TokenBalanceProvider } from '@/contexts/TokenBalanceContext';

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const [showGenerationsModal, setShowGenerationsModal] = useState(false);

  // Protect studio routes - redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <TokenBalanceProvider>
      <GenerationsProvider>
        <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
        {/* Background Effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--banana-gold)]/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        </div>

        {/* 3-Column Layout */}
        <div className="relative z-10 flex h-screen overflow-hidden">
          {/* Left Sidebar - Fixed 80px width */}
          <Sidebar />

          {/* Main Content Area - 40% width */}
          <main className="flex-1 md:w-[40%] flex flex-col overflow-hidden pt-14 md:pt-0  border-r border-white/10">
            {children}
          </main>

          {/* Right Panel - 60% width */}
          <RightPanel />
        </div>

        {/* Mobile generations button */}
        <button
          type="button"
          onClick={() => setShowGenerationsModal(true)}
          className="lg:hidden fixed right-2 bottom-32 z-40 flex items-center gap-2 rounded-full px-4 py-2.5 bg-white/10 border border-white/20 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
        >
          View Generations
        </button>

        <MobileGenerationsModal
          isOpen={showGenerationsModal}
          onClose={() => setShowGenerationsModal(false)}
        />
      </div>
      </GenerationsProvider>
    </TokenBalanceProvider>
  );
}
