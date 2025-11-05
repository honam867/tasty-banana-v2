'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket, useWebSocketEvent } from '@/hooks/useWebSocket';
import { WS_EVENTS } from '@/types/websocket';
import type { GenerationProgressEvent, GenerationCompletedEvent } from '@/types/websocket';
import BananaIcon from '@/components/BananaIcon';
import GlassButton from '@/components/GlassButton';
import GlassCard from '@/components/GlassCard';

export default function StudioPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const { status, isConnected, error } = useWebSocket();
  const [notifications, setNotifications] = useState<string[]>([]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  // Listen to generation progress events
  useWebSocketEvent<GenerationProgressEvent>(
    WS_EVENTS.GENERATION_PROGRESS,
    (data) => {
      console.log('[Studio] Generation Progress:', data);
      setNotifications(prev => [
        `Generation ${data.generationId.slice(0, 8)}: ${data.progress}% - ${data.message}`,
        ...prev.slice(0, 4) // Keep last 5 notifications
      ]);
    }
  );

  // Listen to generation completed events
  useWebSocketEvent<GenerationCompletedEvent>(
    WS_EVENTS.GENERATION_COMPLETED,
    (data) => {
      console.log('[Studio] Generation Completed:', data);
      setNotifications(prev => [
        `✅ Generation ${data.generationId.slice(0, 8)} completed!`,
        ...prev.slice(0, 4)
      ]);
    }
  );

  const handleLogout = () => {
    logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--banana-gold)]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      {/* Navigation Bar */}
      <nav className="relative z-10 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <BananaIcon glowing />
            <span className="text-white font-semibold text-xl">Banana AI Studio</span>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* WebSocket Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-400 animate-pulse' : 
                status === 'connecting' ? 'bg-yellow-400 animate-pulse' : 
                'bg-red-400'
              }`} />
              <span className="text-white/60 text-xs">
                {isConnected ? 'Connected' : 
                 status === 'connecting' ? 'Connecting...' : 
                 status === 'error' ? 'Connection Error' :
                 'Disconnected'}
              </span>
            </div>
            
            <div className="text-white/60 text-sm">
              <span className="text-white/40">Welcome,</span>{' '}
              <span className="text-[var(--banana-gold)]">{user.email}</span>
            </div>
            <GlassButton
              variant="secondary"
              onClick={handleLogout}
              className="border border-white/30 hover:border-red-400/50 text-white/80 hover:text-red-400 text-sm px-4 py-2"
            >
              Logout
            </GlassButton>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          {/* Welcome Section */}
          <div className="text-center space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
                Welcome to the{' '}
                <span className="bg-gradient-to-r from-[var(--banana-gold)] via-orange-400 to-yellow-500 bg-clip-text text-transparent">
                  Studio
                </span>
              </h1>
              <p className="text-xl text-white/60">
                Your creative workspace for AI-powered image generation
              </p>
            </motion.div>
          </div>

          {/* User Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <GlassCard className="max-w-2xl mx-auto p-8">
              <h2 className="text-2xl font-semibold text-white mb-6">Account Information</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-white/10">
                  <span className="text-white/60">Email</span>
                  <span className="text-white font-medium">{user.email}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-white/10">
                  <span className="text-white/60">Username</span>
                  <span className="text-white font-medium">{user.username}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-white/10">
                  <span className="text-white/60">Role</span>
                  <span className="text-white font-medium capitalize">{user.role}</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-white/60">Status</span>
                  <span className={`font-medium ${user.status === 'active' ? 'text-green-400' : 'text-red-400'}`}>
                    {user.status}
                  </span>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Real-time Notifications */}
          {notifications.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <GlassCard className="max-w-2xl mx-auto p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                  Real-time Updates
                </h3>
                <div className="space-y-2">
                  {notifications.map((notification, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-sm text-white/70 bg-white/5 rounded px-3 py-2 border border-white/10"
                    >
                      {notification}
                    </motion.div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Coming Soon Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-center space-y-4 py-12"
          >
            <div className="inline-block px-6 py-2 bg-[var(--banana-gold)]/10 border border-[var(--banana-gold)]/30 rounded-full">
              <span className="text-[var(--banana-gold)] text-sm font-medium">Coming Soon</span>
            </div>
            <p className="text-white/60 text-lg">
              AI image generation features are under development.
              <br />
              Stay tuned for amazing capabilities!
            </p>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
