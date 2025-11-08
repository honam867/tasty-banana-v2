'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { GenerationsProvider } from '@/contexts/GenerationsContext';
import Sidebar from '@/components/studio/Sidebar';
import RightPanel from '@/components/studio/RightPanel';

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

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
          <main className="flex-1 md:w-[40%] flex flex-col overflow-hidden pb-16 md:pb-0 border-r border-white/10">
            {children}
          </main>

          {/* Right Panel - 60% width */}
          <RightPanel />
        </div>
      </div>
    </GenerationsProvider>
  );
}
