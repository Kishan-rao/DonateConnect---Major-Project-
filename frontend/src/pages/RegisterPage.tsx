import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { OtpInput } from '../components/OtpInput';
import { RegisterRequest } from '../types';
import { resendOtpApi } from '../api/authApi';
import { UserPlus, Mail, Lock, User as UserIcon, HeartHandshake, ShieldAlert, Building2 } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register: authRegister, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRoleParam = searchParams.get('role')?.toUpperCase();
  const getInitialRole = (param?: string): 'DONOR' | 'VOLUNTEER' | 'NGO' => {
    if (param === 'NGO') return 'NGO';
    if (param === 'VOLUNTEER' || param === 'DELIVERY' || param === 'DELIVERY_PARTNER' || param === 'DELIVERY-PARTNER') return 'VOLUNTEER';
    return 'DONOR';
  };
  const initialRole: 'DONOR' | 'VOLUNTEER' | 'NGO' = getInitialRole(initialRoleParam);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // OTP State
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'DONOR' | 'VOLUNTEER' | 'NGO'>(initialRole);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterRequest>();

  const routeByRole = (role: string) => {
    switch (role) {
      case 'NGO':
        return '/ngo-dashboard';
      case 'VOLUNTEER':
        return '/driver-dashboard';
      case 'ADMIN':
        return '/admin';
      case 'CORPORATE':
        return '/csr-dashboard';
      case 'DONOR':
      default:
        return '/donations';
    }
  };

  const onSubmit = async (data: RegisterRequest) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authRegister({ ...data, role: selectedRole });
      if (res.requiresOtp) {
        setShowOtp(true);
        setRegisterEmail(data.email);
      } else {
        // Use the role from the backend response as the authoritative source
        navigate(routeByRole(res.user?.role ?? selectedRole));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Registration failed.');
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
    if (resending || resendCountdown > 0 || !registerEmail) return;
    setResending(true);
    setError(null);
    setResendMessage(null);
    try {
      await resendOtpApi(registerEmail);
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
      const user = await verifyOtp({ email: registerEmail, otp: otpCode });
      // Use the role from the backend-verified user as the authoritative source
      navigate(routeByRole(user?.role ?? selectedRole));
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Invalid OTP code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3">
            <HeartHandshake className="w-7 h-7 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="text-slate-400 text-xs mt-1">Join DonateConnect today</p>
        </div>

        <div className="mb-6 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong>Public Registration:</strong> You can register as a <strong>Donor</strong>, <strong>Delivery Partner</strong>, or <strong>NGO</strong>. NGO & Delivery Partner accounts require admin approval after email verification.
          </span>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium text-center">
            {error}
          </div>
        )}

        {!showOtp ? (
          <>
            <div className="flex p-1 bg-slate-950/50 rounded-xl mb-6 border border-slate-800/50">
              <button
                type="button"
                onClick={() => setSelectedRole('DONOR')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  selectedRole === 'DONOR'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                Register as Donor
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('VOLUNTEER')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  selectedRole === 'VOLUNTEER'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                Register as Delivery Partner
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('NGO')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  selectedRole === 'NGO'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                Register as NGO
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  {selectedRole === 'NGO' ? 'NGO / Organization Name' : 'Full Name'}
                </label>
                <div className="relative">
                  {selectedRole === 'NGO' ? (
                    <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  ) : (
                    <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  )}
                  <input
                    type="text"
                    placeholder={selectedRole === 'NGO' ? 'e.g. Akshaya Relief Foundation' : 'Jane Doe'}
                    {...register('fullName', {
                      required: selectedRole === 'NGO' ? 'Organization name is required' : 'Full name is required',
                    })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                {errors.fullName && (
                  <p className="text-rose-400 text-xs mt-1">{errors.fullName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    placeholder="jane@example.com"
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address',
                      },
                    })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                {errors.email && (
                  <p className="text-rose-400 text-xs mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder="Minimum 6 characters"
                    {...register('password', {
                      required: 'Password is required',
                      minLength: { value: 6, message: 'Password must be at least 6 characters' },
                    })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                {errors.password && (
                  <p className="text-rose-400 text-xs mt-1">{errors.password.message}</p>
                )}
              </div>

              {selectedRole === 'NGO' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      NGO Operational Address (Bengaluru)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. 123 Indiranagar, Bengaluru, Karnataka"
                        {...register('address', { required: selectedRole === 'NGO' ? 'Address is required' : false })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <p className="text-slate-500 text-[11px] mt-1">Currently registering NGOs operating in Bengaluru / Bangalore region.</p>
                    {errors.address && (
                      <p className="text-rose-400 text-xs mt-1">{errors.address.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Phone Number
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="+91 98765 43210"
                        {...register('phone', { required: selectedRole === 'NGO' ? 'Phone number is required' : false })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-rose-400 text-xs mt-1">{errors.phone.message}</p>
                    )}
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-rose-600 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Complete Registration
                  </>
                )}
              </button>
            </form>

            <div className="text-center mt-6 pt-6 border-t border-slate-800/80">
              <p className="text-xs text-slate-400">
                Already have an account?{' '}
                <Link to="/login" className="text-indigo-400 font-semibold hover:underline">
                  Sign In
                </Link>
              </p>
            </div>
          </>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="mb-4 text-center">
              <p className="text-slate-300 text-sm">
                We've sent a 6-digit code to <span className="font-bold text-white">{registerEmail}</span>.
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                6-Digit OTP Code
              </label>
              <div className="relative pt-2">
                <OtpInput value={otpCode} onChange={setOtpCode} />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-400">Didn't receive the code?</span>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resending || resendCountdown > 0}
                className="text-indigo-400 hover:text-indigo-300 font-semibold disabled:opacity-50 transition-colors"
              >
                {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : resending ? 'Sending...' : 'Resend Code'}
              </button>
            </div>

            {resendMessage && (
              <p className="text-emerald-400 text-xs text-center font-medium">{resendMessage}</p>
            )}

            <button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-rose-600 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Verify & Complete Registration'
              )}
            </button>
            <button
              type="button"
              onClick={() => { setShowOtp(false); setError(null); }}
              className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-all flex items-center justify-center mt-2"
            >
              Go Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
