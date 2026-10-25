import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { OtpInput } from '../components/OtpInput';
import { LoginRequest } from '../types';
import { resendOtpApi } from '../api/authApi';
import { LogIn, Mail, Lock, HeartHandshake, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'DONOR' | 'NGO' | 'ADMIN' | 'VOLUNTEER'>('DONOR');
  
  // OTP State
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginRequest>();

  const handleRoleSelect = (role: 'DONOR' | 'NGO' | 'ADMIN' | 'VOLUNTEER') => {
    setSelectedRole(role);
    setError(null);
    // Auto-fill demo credentials to make testing easier
    if (role === 'DONOR') {
      setValue('email', 'priya.patel@gmail.com');
      setValue('password', 'donor123');
    } else if (role === 'NGO') {
      setValue('email', 'contact@goonj.org');
      setValue('password', 'password123');
    } else if (role === 'ADMIN') {
      setValue('email', 'admin@donateconnect.in');
      setValue('password', 'admin123');
    } else if (role === 'VOLUNTEER') {
      setValue('email', 'dispatch@donateconnect.in');
      setValue('password', 'driver123');
    }
  };

  useEffect(() => {
    const roleParam = searchParams.get('role')?.toUpperCase();
    if (roleParam === 'NGO' || roleParam === 'ADMIN' || roleParam === 'DONOR') {
      handleRoleSelect(roleParam as 'DONOR' | 'NGO' | 'ADMIN');
    } else if (roleParam === 'VOLUNTEER' || roleParam === 'DELIVERY' || roleParam === 'DELIVERY_PARTNER' || roleParam === 'DELIVERY-PARTNER') {
      handleRoleSelect('VOLUNTEER');
    }
  }, [searchParams]);

  const onSubmit = async (data: LoginRequest) => {
    setLoading(true);
    setError(null);
    try {
      const res = await login({
        ...data,
        expectedRole: selectedRole,
      });
      if (res.requiresOtp) {
        setShowOtp(true);
        setLoginEmail(data.email);
      } else {
        routeUser(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const handleResendOtp = async () => {
    if (resending || resendCountdown > 0 || !loginEmail) return;
    setResending(true);
    setError(null);
    setResendMessage(null);
    try {
      await resendOtpApi(loginEmail);
      setResendMessage('Verification code resent successfully.');
      setResendCountdown(60);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to resend verification code.');
    } finally {
      setResending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await verifyOtp({ email: loginEmail, otp: otpCode });
      routeUser(user);
    } catch (err: any) {
      setError(err.message || 'Invalid OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const routeUser = (user: any) => {
    const role = (user?.role || '').replace(/^ROLE_/, '');
    if (role === 'DONOR') {
      navigate('/donations');
    } else if (role === 'NGO') {
      navigate('/ngo-dashboard');
    } else if (role === 'ADMIN') {
      navigate('/admin');
    } else if (role === 'VOLUNTEER') {
      navigate('/driver-dashboard');
    } else if (role === 'CORPORATE') {
      navigate('/csr-dashboard');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="bg-white border border-[#E5E7EB] rounded-3xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#7567E8]/10 border border-[#7567E8]/20 text-[#7567E8] flex items-center justify-center mx-auto mb-3">
            <HeartHandshake className="w-7 h-7 text-[#7567E8]" />
          </div>
          <h1 className="text-2xl font-bold text-[#111827]">
            {showOtp ? 'Verify OTP' : selectedRole === 'ADMIN' ? 'Admin Portal' : selectedRole === 'NGO' ? 'NGO Portal' : 'Welcome Back'}
          </h1>
          <p className="text-[#4B5563] text-xs mt-1">
            {showOtp ? `Enter the 6-digit code sent to ${loginEmail}` : 'Sign in to your DonateConnect account'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-center">
            {error}
          </div>
        )}

        {!showOtp ? (
          <>
            {/* Role Selector Tabs */}
            <div className="flex p-1 bg-[#F9FAFB] rounded-xl mb-8 border border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => handleRoleSelect('DONOR')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  selectedRole === 'DONOR'
                    ? 'bg-[#7567E8] text-white shadow-xs'
                    : 'text-[#4B5563] hover:text-[#111827] hover:bg-white'
                }`}
              >
                Donor
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect('NGO')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  selectedRole === 'NGO'
                    ? 'bg-[#7567E8] text-white shadow-xs'
                    : 'text-[#4B5563] hover:text-[#111827] hover:bg-white'
                }`}
              >
                NGO
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect('VOLUNTEER')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  selectedRole === 'VOLUNTEER'
                    ? 'bg-[#7567E8] text-white shadow-xs'
                    : 'text-[#4B5563] hover:text-[#111827] hover:bg-white'
                }`}
              >
                Delivery Partner
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect('ADMIN')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  selectedRole === 'ADMIN'
                    ? 'bg-[#7567E8] text-white shadow-xs'
                    : 'text-[#4B5563] hover:text-[#111827] hover:bg-white'
                }`}
              >
                Admin
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    placeholder="name@example.com"
                    {...register('email', { required: 'Email is required' })}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#7567E8] transition-colors"
                  />
                </div>
                {errors.email && (
                  <p className="text-rose-600 text-xs mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    {...register('password', { required: 'Password is required' })}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#7567E8] transition-colors"
                  />
                </div>
                {errors.password && (
                  <p className="text-rose-600 text-xs mt-1">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-[#7567E8] hover:bg-[#7567E8]/90 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </>
                )}
              </button>
            </form>

            <div className="text-center mt-6 pt-6 border-t border-[#E5E7EB]">
              <p className="text-xs text-[#4B5563]">
                Don't have an account?{' '}
                <Link
                  to={selectedRole === 'NGO' ? '/register?role=ngo' : selectedRole === 'VOLUNTEER' ? '/register?role=volunteer' : '/register?role=donor'}
                  className="text-[#7567E8] font-semibold hover:underline inline-flex items-center gap-0.5"
                >
                  {selectedRole === 'NGO' ? 'Register as NGO' : selectedRole === 'VOLUNTEER' ? 'Register as Delivery Partner' : 'Register as Donor'}{' '}
                  <ArrowRight className="w-3 h-3 ml-0.5" />
                </Link>
              </p>
            </div>
          </>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5">
                6-Digit OTP Code
              </label>
              <div className="relative pt-2">
                <OtpInput value={otpCode} onChange={setOtpCode} />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[#4B5563]">Didn't receive the code?</span>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resending || resendCountdown > 0}
                className="text-[#7567E8] hover:text-[#7567E8]/80 font-semibold disabled:opacity-50 transition-colors"
              >
                {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : resending ? 'Sending...' : 'Resend Code'}
              </button>
            </div>

            {resendMessage && (
              <p className="text-emerald-700 text-xs text-center font-medium">{resendMessage}</p>
            )}

            <button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="w-full py-3 px-4 rounded-xl bg-[#7567E8] hover:bg-[#7567E8]/90 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Verify & Login'
              )}
            </button>
            <button
              type="button"
              onClick={() => { setShowOtp(false); setError(null); }}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-[#F4F2FA] text-[#4B5563] border border-[#E5E7EB] font-bold text-sm transition-all flex items-center justify-center mt-2 shadow-xs"
            >
              Cancel & Go Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
