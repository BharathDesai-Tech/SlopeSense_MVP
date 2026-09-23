import { useEffect, useState, type FormEvent } from 'react';
import { X, Mail, Lock, User as UserIcon, Eye, EyeOff, ShieldCheck, BadgeAlert, Building2, MapPin, KeyRound, Wifi, WifiOff } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const { login, registerCitizen, registerAuthority, verifyEmail, resendOtp, forgotPassword, resetPassword, isOnline } = useApp();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'login' | 'register' | 'verify' | 'forgot'>('login');
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [newPassword, setNewPassword] = useState('');
  const [userType, setUserType] = useState<'citizen' | 'authority'>('citizen');

  // Common Fields
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP Verification Fields
  const [verificationEmail, setVerificationEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [demoOtp, setDemoOtp] = useState<string | null>(null);

  // Authority-specific Fields
  const [organization, setOrganization] = useState('NDRF (National Disaster Response Force)');
  const [badgeId, setBadgeId] = useState('');
  const [district, setDistrict] = useState('Kamrup Metropolitan (Guwahati)');
  const [deptCode, setDeptCode] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Verification Mode Submit
    if (mode === 'verify') {
      if (otp.trim().length !== 6) {
        setError('Please enter a valid 6-digit verification code.');
        return;
      }
      setLoading(true);
      try {
        const res = await verifyEmail(verificationEmail, otp.trim());
        if (!res.ok) {
          setError(res.message || 'Incorrect verification code. Please check and try again.');
          setLoading(false);
          return;
        }
        showToast('Email verified successfully! You are now logged in.');
        handleClose();
      } catch {
        setError('Failed to verify code due to network error.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Forgot Password Submit
    if (mode === 'forgot') {
      if (forgotStep === 1) {
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail || !normalizedEmail.includes('@')) {
          setError('Please enter a valid registered email address.');
          return;
        }
        setLoading(true);
        try {
          const res = await forgotPassword(normalizedEmail);
          if (res.ok) {
            setVerificationEmail(normalizedEmail);
            if (res.demo_otp) setDemoOtp(res.demo_otp);
            setForgotStep(2);
            showToast(res.message || 'Password reset code dispatched.');
          } else {
            setError(res.message || 'No account registered with this email address.');
          }
        } catch {
          setError('Network error requesting reset code.');
        } finally {
          setLoading(false);
        }
        return;
      } else {
        if (otp.trim().length !== 6) {
          setError('Please enter the 6-digit password reset code.');
          return;
        }
        if (newPassword.length < 6) {
          setError('New password must be at least 6 characters.');
          return;
        }
        setLoading(true);
        try {
          const res = await resetPassword(verificationEmail, otp.trim(), newPassword);
          if (res.ok) {
            showToast('Password reset successfully! You are now signed in.');
            handleClose();
          } else {
            setError(res.message || 'Invalid or expired reset code.');
          }
        } catch {
          setError('Network error resetting password.');
        } finally {
          setLoading(false);
        }
        return;
      }
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const result = await login(normalizedEmail, password);
        if (!result.ok) {
          if (result.pending_verification) {
            setVerificationEmail(result.email || normalizedEmail);
            setMode('verify');
            setError('Account verification required. A 6-digit code has been sent.');
            const demoMatch = result.message?.match(/\b\d{6}\b/);
            if (demoMatch) setDemoOtp(demoMatch[0]);
            setLoading(false);
            return;
          }
          setError(result.message ?? 'Unable to sign in. Verify your email and password.');
          setLoading(false);
          return;
        }
        showToast('Signed in successfully.');
        handleClose();
      } else if (userType === 'citizen') {
        if (name.trim().length < 2) {
          setError('Please enter your full name.');
          setLoading(false);
          return;
        }
        const result = await registerCitizen({
          name: name.trim(),
          email: normalizedEmail,
          password,
          phone: phone.trim() || undefined,
        });
        if (!result.ok) {
          setError(result.message ?? 'Citizen registration failed.');
          setLoading(false);
          return;
        }
        if (result.pending_verification) {
          setVerificationEmail(result.email || normalizedEmail);
          if (result.demo_otp) setDemoOtp(result.demo_otp);
          setMode('verify');
          showToast('Verification code dispatched. Enter the 6-digit code to activate.');
          setLoading(false);
          return;
        }
        showToast('Citizen account registered successfully.');
        handleClose();
      } else {
        // Authority registration
        if (name.trim().length < 2) {
          setError('Officer name is required.');
          setLoading(false);
          return;
        }
        if (!badgeId.trim()) {
          setError('Official Officer Badge / Service ID is required.');
          setLoading(false);
          return;
        }
        if (!deptCode.trim()) {
          setError('Official Department Authorization Code is required.');
          setLoading(false);
          return;
        }

        const result = await registerAuthority({
          name: name.trim(),
          email: normalizedEmail,
          password,
          organization,
          badge_id: badgeId.trim().toUpperCase(),
          district,
          department_code: deptCode.trim(),
          phone: phone.trim() || undefined,
        });

        if (!result.ok) {
          setError(result.message ?? 'Authorization key verification failed.');
          setLoading(false);
          return;
        }
        if (result.pending_verification) {
          setVerificationEmail(result.email || normalizedEmail);
          if (result.demo_otp) setDemoOtp(result.demo_otp);
          setMode('verify');
          showToast('Officer credentials recorded. Enter the 6-digit OTP code to finalize clearance.');
          setLoading(false);
          return;
        }
        showToast('Authority / Responder access granted.');
        handleClose();
      }
    } catch {
      setError('Network communication error. Operation aborted.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!verificationEmail) return;
    setLoading(true);
    setError('');
    try {
      const res = await resendOtp(verificationEmail);
      if (res.ok) {
        if (res.demo_otp) setDemoOtp(res.demo_otp);
        showToast('A fresh 6-digit verification code has been sent.');
      } else {
        setError(res.message || 'Could not resend code.');
      }
    } catch {
      setError('Error resending verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setName('');
    setPassword('');
    setPhone('');
    setBadgeId('');
    setDeptCode('');
    setOtp('');
    setDemoOtp(null);
    setVerificationEmail('');
    setMode('login');
    setError('');
    setShowPassword(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6" onClick={handleClose}>
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md animate-fade-in" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        className="relative max-h-[min(760px,calc(100dvh-1.5rem))] w-full max-w-xl animate-slide-up overflow-y-auto rounded-3xl bg-white shadow-2xl border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
              mode === 'register' && userType === 'authority'
                ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {mode === 'register' && userType === 'authority' ? (
                <BadgeAlert className="h-6 w-6" />
              ) : (
                <ShieldCheck className="h-6 w-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="auth-title" className="text-lg font-bold text-slate-900">
                  {mode === 'login'
                    ? 'SlopeSense AI Sign In'
                    : userType === 'citizen'
                    ? 'Citizen Portal Registration'
                    : 'Disaster Authority & NDRF Portal'}
                </h3>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  isOnline ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                }`}>
                  {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                  {isOnline ? 'Cloud Sync' : 'Offline Mode'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {mode === 'login'
                  ? 'Access your monitoring dashboard and submitted slope alerts.'
                  : userType === 'citizen'
                  ? 'Sign up to report tension cracks and access offline emergency safe shelters.'
                  : 'Official portal for NDRF, SDMA, and District First Responders.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            type="button"
            aria-label="Close authentication dialog"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200/70 text-slate-600 transition-colors hover:bg-slate-300 active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Primary Tabs: Sign In vs Create Account (Hidden in Verify and Forgot modes) */}
        {mode === 'login' || mode === 'register' ? (
          <div className="grid grid-cols-2 gap-2 px-6 pt-5">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              className={`rounded-xl py-2.5 text-sm font-bold transition-all ${
                mode === 'login'
                  ? 'bg-blue-700 text-white shadow-md shadow-blue-700/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Existing User Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); }}
              className={`rounded-xl py-2.5 text-sm font-bold transition-all ${
                mode === 'register'
                  ? 'bg-blue-700 text-white shadow-md shadow-blue-700/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Create New Account
            </button>
          </div>
        ) : mode === 'verify' ? (
          <div className="px-6 pt-5">
            <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-blue-900">Two-Factor Email Verification</p>
                <p className="text-[11px] text-blue-700">Code dispatched to <strong className="font-mono">{verificationEmail}</strong></p>
              </div>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs text-blue-700 hover:text-blue-900 font-bold underline"
              >
                Change Email
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 pt-5">
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-amber-950">Password Recovery (6-Digit OTP)</p>
                <p className="text-[11px] text-amber-800">
                  {forgotStep === 1
                    ? 'Enter your registered email to receive a password reset code.'
                    : `Reset code dispatched to ${verificationEmail}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setMode('login'); setForgotStep(1); setError(''); }}
                className="text-xs text-amber-900 hover:underline font-bold"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* If Register Mode: Choose Citizen vs Authority */}
        {mode === 'register' && (
          <div className="px-6 pt-4">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
              Select Registration Portal
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUserType('citizen')}
                className={`flex flex-col items-start gap-1 p-3 rounded-2xl border text-left transition-all ${
                  userType === 'citizen'
                    ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 text-blue-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  <UserIcon className="h-4 w-4 text-blue-600" />
                  Public Citizen
                </div>
                <span className="text-xs text-slate-500">Local residents, travelers & volunteers</span>
              </button>

              <button
                type="button"
                onClick={() => setUserType('authority')}
                className={`flex flex-col items-start gap-1 p-3 rounded-2xl border text-left transition-all ${
                  userType === 'authority'
                    ? 'border-amber-600 bg-amber-50/70 ring-2 ring-amber-500/20 text-amber-950'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  <BadgeAlert className="h-4 w-4 text-amber-600" />
                  Disaster Authority
                </div>
                <span className="text-xs text-slate-500">NDRF, SDMA, GSI & First Responders</span>
              </button>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div role="alert" className="rounded-2xl bg-red-50 p-3.5 text-sm font-semibold text-red-700 ring-1 ring-red-200">
              ⚠️ {error}
            </div>
          )}

          {mode === 'forgot' ? (
            <div className="space-y-4">
              {forgotStep === 1 ? (
                <>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">
                      Registered Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        name="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. officer@ndrf.gov.in"
                        required
                        className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all shadow-md active:scale-95 disabled:opacity-50 bg-blue-700 hover:bg-blue-800 shadow-blue-700/25"
                  >
                    {loading ? 'Transmitting Reset Code...' : 'Send 6-Digit Reset Code'}
                  </button>
                </>
              ) : (
                <>
                  {demoOtp && (
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
                      <div className="flex items-center gap-2 text-xs text-amber-900 font-semibold">
                        <KeyRound className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>Demo Evaluation Code: <strong className="font-mono text-sm tracking-wider text-amber-950">{demoOtp}</strong></span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOtp(demoOtp)}
                        className="text-xs font-bold text-amber-800 hover:text-amber-950 underline px-2 py-1 bg-amber-100 rounded-lg"
                      >
                        Auto-Fill
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 block text-center">
                      Enter 6-Digit Password Reset Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="------"
                      autoFocus
                      required
                      className="w-full text-center text-3xl font-mono font-black tracking-[0.6em] py-4 rounded-2xl border-2 border-blue-500 bg-blue-50/20 text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        required
                        className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-12 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6 || newPassword.length < 6}
                    className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all shadow-md active:scale-95 disabled:opacity-50 bg-blue-700 hover:bg-blue-800 shadow-blue-700/25"
                  >
                    {loading ? 'Updating Password...' : 'Reset Password & Sign In'}
                  </button>
                </>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setForgotStep(1); setError(''); }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel & Back to Sign In
                </button>
              </div>
            </div>
          ) : mode === 'verify' ? (
            <div className="space-y-4">
              {demoOtp && (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-2 text-xs text-amber-900 font-semibold">
                    <KeyRound className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Demo Evaluation Code: <strong className="font-mono text-sm tracking-wider text-amber-950">{demoOtp}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtp(demoOtp)}
                    className="text-xs font-bold text-amber-800 hover:text-amber-950 underline px-2 py-1 bg-amber-100 rounded-lg"
                  >
                    Auto-Fill
                  </button>
                </div>
              )}

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 block text-center">
                  Enter 6-Digit Email Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="------"
                  autoFocus
                  required
                  className="w-full text-center text-3xl font-mono font-black tracking-[0.6em] py-4 rounded-2xl border-2 border-blue-500 bg-blue-50/20 text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600"
                />
                <p className="text-center text-xs text-slate-500 mt-2">
                  Check your inbox for the authorization code sent to <strong>{verificationEmail}</strong>.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all shadow-md active:scale-95 disabled:opacity-50 bg-blue-700 hover:bg-blue-800 shadow-blue-700/25"
              >
                {loading ? 'Verifying Code...' : 'Verify & Activate Account'}
              </button>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading}
                  className="text-xs font-bold text-blue-700 hover:text-blue-800 underline"
                >
                  Resend Verification Code
                </button>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          ) : (
            <>
              {mode === 'register' && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">
                    {userType === 'authority' ? 'Officer Full Name' : 'Full Name'}
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={userType === 'authority' ? 'e.g. Commander Rajesh Kalita' : 'e.g. Bipin Gogoi'}
                      required
                      className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>
              )}

              {/* Authority Specific Fields */}
              {mode === 'register' && userType === 'authority' && (
                <div className="space-y-3 p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900">
                    <Building2 className="h-4 w-4 text-amber-700" />
                    Official Responder Verification
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">Government Agency / Organization</label>
                    <select
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-200"
                    >
                      <option value="NDRF (National Disaster Response Force)">NDRF (National Disaster Response Force)</option>
                      <option value="ASDMA (Assam State Disaster Management)">ASDMA (Assam State Disaster Management)</option>
                      <option value="Meghalaya SDMA">Meghalaya SDMA</option>
                      <option value="Sikkim State Disaster Management">Sikkim State Disaster Management</option>
                      <option value="GSI (Geological Survey of India)">GSI (Geological Survey of India)</option>
                      <option value="PWD Mountain Road Cell">PWD Mountain Road Cell</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-1 block">Officer / Badge ID</label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-600" />
                        <input
                          type="text"
                          value={badgeId}
                          onChange={(e) => setBadgeId(e.target.value)}
                          placeholder="e.g. NDRF-12-882"
                          required
                          className="w-full rounded-xl border border-amber-300 pl-9 pr-3 py-2 text-sm uppercase text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-amber-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-1 block">Assigned District / Sector</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-600" />
                        <input
                          type="text"
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          placeholder="e.g. Kamrup Metro"
                          required
                          className="w-full rounded-xl border border-amber-300 pl-9 pr-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-amber-200"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      Department Authorization Code
                      <span className="ml-1 text-amber-800 font-normal">(Demo Key: <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-900">NDRF-SECURE-2026</code> or <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-900">SDMA-2026</code>)</span>
                    </label>
                    <input
                      type="text"
                      value={deptCode}
                      onChange={(e) => setDeptCode(e.target.value)}
                      placeholder="Enter secret clearance code"
                      required
                      className="w-full rounded-xl border border-amber-300 px-3 py-2 text-sm uppercase font-mono tracking-wider text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-amber-200"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">
                  {mode === 'register' && userType === 'authority' ? 'Official Agency Email' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={mode === 'register' && userType === 'authority' ? 'officer@ndrf.gov.in' : 'citizen@example.com'}
                    required
                    className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Password</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setForgotStep(1);
                        setError('');
                      }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-12 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all shadow-md active:scale-95 disabled:opacity-50 ${
                  mode === 'register' && userType === 'authority'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                    : 'bg-blue-700 hover:bg-blue-800 shadow-blue-700/25'
                }`}
              >
                {loading
                  ? 'Verifying Credentials...'
                  : mode === 'login'
                  ? 'Sign In to SlopeSense AI'
                  : userType === 'citizen'
                  ? 'Register Citizen Account'
                  : 'Authorize & Register First Responder'}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
