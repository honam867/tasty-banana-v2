'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import AuthLayout from '@/components/AuthLayout';
import FormField from '@/components/FormField';
import GlassButton from '@/components/GlassButton';
import { useAuth } from '@/contexts/AuthContext';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, loading: authLoading } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Check for success message from registration
  useEffect(() => {
    const registered = searchParams.get('registered');
    if (registered === 'true') {
      setSuccessMessage('Registration successful! Please login with your credentials.');
    }
  }, [searchParams]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.push('/studio');
    }
  }, [isAuthenticated, authLoading, router]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');

    if (!validateForm()) return;

    setLoading(true);
    try {
      const success = await login(formData.email, formData.password, formData.remember);

      if (success) {
        router.push('/studio');
      } else {
        setErrors({ general: 'Invalid email or password' });
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Login failed. Please try again.';
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: e.target.value });
    // Clear error for this field
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  // Show loading state while checking authentication or redirecting
  if (authLoading || isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-white text-lg">
            {isAuthenticated ? 'Redirecting to studio...' : 'Loading...'}
          </div>
          {/* Optional: Add a spinner */}
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-[var(--banana-gold)]/30 border-t-[var(--banana-gold)] rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Enter the Studio and create amazing AI visuals"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Success Message */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-green-400 text-sm"
          >
            {successMessage}
          </motion.div>
        )}

        {/* General Error */}
        {errors.general && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm"
          >
            {errors.general}
          </motion.div>
        )}

        {/* Email Field */}
        <FormField
          label="Email"
          type="email"
          placeholder="your@email.com"
          value={formData.email}
          onChange={handleChange('email')}
          error={errors.email}
          required
        />

        {/* Password Field */}
        <FormField
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={formData.password}
          onChange={handleChange('password')}
          error={errors.password}
          required
          showPasswordToggle
        />

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center space-x-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={formData.remember}
              onChange={(e) => setFormData({ ...formData, remember: e.target.checked })}
              className="w-4 h-4 rounded border-white/30 bg-white/5 text-[var(--banana-gold)] focus:ring-[var(--banana-gold)] focus:ring-offset-0"
            />
            <span className="text-white/60 text-sm group-hover:text-white/80 transition-colors">
              Remember me
            </span>
          </label>

          <Link
            href="/forgot"
            className="text-[var(--banana-gold)] hover:text-[var(--banana-gold)]/80 text-sm transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        {/* Submit Button */}
        <button type="submit" className="w-full">
          <GlassButton
            variant="primary"
            className="w-full bg-[var(--banana-gold)]/10 border-2 border-[var(--banana-gold)]/50 hover:bg-[var(--banana-gold)]/20 text-[var(--banana-gold)] font-semibold py-3 shadow-[0_0_20px_rgba(255,215,0,0.2)] hover:shadow-[0_0_30px_rgba(255,215,0,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Enter the Studio'}
          </GlassButton>
        </button>

        {/* Register Link */}
        <div className="text-center pt-4 border-t border-white/10">
          <span className="text-white/60 text-sm">
            Don't have an account?{' '}
            <Link
              href="/register"
              className="text-[var(--banana-gold)] hover:text-[var(--banana-gold)]/80 font-medium transition-colors"
            >
              Create one
            </Link>
          </span>
        </div>
      </form>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
