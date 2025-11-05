'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import AuthLayout from '@/components/AuthLayout';
import FormField from '@/components/FormField';
import GlassButton from '@/components/GlassButton';
import apiClient from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/constants';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validateEmail = () => {
    if (!email) {
      setError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email is invalid');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!validateEmail()) return;

    setLoading(true);
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
      setSuccess(true);
      setEmail('');
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 'Failed to send reset email. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Enter your email to receive password reset instructions"
    >
      {success ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Success Message */}
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-white">Check Your Email</h3>
            <p className="text-white/60 text-sm">
              We've sent password reset instructions to your email. 
              Please check your inbox and follow the link to reset your password.
            </p>
          </div>

          {/* Back to Login */}
          <div className="pt-4">
            <Link href="/login">
              <GlassButton
                variant="primary"
                className="w-full bg-[var(--banana-gold)]/10 border-2 border-[var(--banana-gold)]/50 hover:bg-[var(--banana-gold)]/20 text-[var(--banana-gold)] font-semibold py-3"
              >
                Back to Login
              </GlassButton>
            </Link>
          </div>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Info Message */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-blue-400 text-sm">
            <p>Enter your email address and we'll send you a new password.</p>
          </div>

          {/* Email Field */}
          <FormField
            label="Email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
            error={error}
            required
          />

          {/* Submit Button */}
          <button type="submit" className="w-full">
            <GlassButton
              variant="primary"
              className="w-full bg-[var(--banana-gold)]/10 border-2 border-[var(--banana-gold)]/50 hover:bg-[var(--banana-gold)]/20 text-[var(--banana-gold)] font-semibold py-3 shadow-[0_0_20px_rgba(255,215,0,0.2)] hover:shadow-[0_0_30px_rgba(255,215,0,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Reset Instructions'}
            </GlassButton>
          </button>

          {/* Back to Login Link */}
          <div className="text-center pt-4 border-t border-white/10">
            <Link
              href="/login"
              className="text-white/60 hover:text-[var(--banana-gold)] text-sm transition-colors"
            >
              ← Back to Login
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
