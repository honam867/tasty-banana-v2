'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import AuthLayout from '@/components/AuthLayout';
import FormField from '@/components/FormField';
import GlassButton from '@/components/GlassButton';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, loading: authLoading } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: '',
    color: '',
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.push('/studio');
    }
  }, [isAuthenticated, authLoading, router]);

  // Calculate password strength
  useEffect(() => {
    if (!formData.password) {
      setPasswordStrength({ score: 0, label: '', color: '' });
      return;
    }

    let score = 0;
    const { password } = formData;

    // Length
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;

    // Character types
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    let label = '';
    let color = '';

    if (score <= 2) {
      label = 'Weak';
      color = 'bg-red-500';
    } else if (score <= 4) {
      label = 'Fair';
      color = 'bg-yellow-500';
    } else {
      label = 'Strong';
      color = 'bg-green-500';
    }

    setPasswordStrength({ score, label, color });
  }, [formData.password]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const success = await register({
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      if (success) {
        // Redirect to login with success message
        router.push('/login?registered=true');
      } else {
        setErrors({ general: 'Registration failed. Please try again.' });
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Registration failed. Please try again.';
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
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-[var(--banana-gold)]/30 border-t-[var(--banana-gold)] rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthLayout
      title="Join the Studio"
      subtitle="Create your account and start generating amazing AI visuals"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
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
        <div>
          <FormField
            label="Password"
            type="password"
            placeholder="Create a strong password"
            value={formData.password}
            onChange={handleChange('password')}
            error={errors.password}
            required
            showPasswordToggle
          />

          {/* Password Strength Indicator */}
          {formData.password && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${passwordStrength.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <span className="text-xs text-white/60">{passwordStrength.label}</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Confirm Password Field */}
        <FormField
          label="Confirm Password"
          type="password"
          placeholder="Re-enter your password"
          value={formData.confirmPassword}
          onChange={handleChange('confirmPassword')}
          error={errors.confirmPassword}
          required
          showPasswordToggle
        />

        {/* Password Requirements */}
        <div className="text-xs text-white/50 space-y-1">
          <p>Password must contain:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li className={formData.password.length >= 8 ? 'text-green-400' : ''}>
              At least 8 characters
            </li>
            <li className={/[A-Z]/.test(formData.password) ? 'text-green-400' : ''}>
              One uppercase letter
            </li>
            <li className={/[a-z]/.test(formData.password) ? 'text-green-400' : ''}>
              One lowercase letter
            </li>
            <li className={/[0-9]/.test(formData.password) ? 'text-green-400' : ''}>
              One number
            </li>
            <li className={/[^a-zA-Z0-9]/.test(formData.password) ? 'text-green-400' : ''}>
              One special character
            </li>
          </ul>
        </div>

        {/* Submit Button */}
        <button type="submit" className="w-full">
          <GlassButton
            variant="primary"
            className="w-full bg-[var(--banana-gold)]/10 border-2 border-[var(--banana-gold)]/50 hover:bg-[var(--banana-gold)]/20 text-[var(--banana-gold)] font-semibold py-3 shadow-[0_0_20px_rgba(255,215,0,0.2)] hover:shadow-[0_0_30px_rgba(255,215,0,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </GlassButton>
        </button>

        {/* Login Link */}
        <div className="text-center pt-4 border-t border-white/10">
          <span className="text-white/60 text-sm">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-[var(--banana-gold)] hover:text-[var(--banana-gold)]/80 font-medium transition-colors"
            >
              Sign in
            </Link>
          </span>
        </div>
      </form>
    </AuthLayout>
  );
}
