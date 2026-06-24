import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, setPersistence, browserLocalPersistence, browserSessionPersistence, browserPopupRedirectResolver, deleteUser, getMultiFactorResolver, PhoneAuthProvider, PhoneMultiFactorGenerator, RecaptchaVerifier } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Croissant, Mail, Lock, User, ShieldCheck, Truck, Store, Phone, KeyRound, ChevronRight, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = React.useState(true);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [phonePrefix, setPhonePrefix] = React.useState('+964');
  const [phoneError, setPhoneError] = React.useState('');
  const [role, setRole] = React.useState<'customer' | 'owner'>('customer');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(true);
  const [isForgotPassword, setIsForgotPassword] = React.useState(false);
  const [resetEmail, setResetEmail] = React.useState('');
  const [resetLoading, setResetLoading] = React.useState(false);
  const [resetSent, setResetSent] = React.useState(false);
  const [verificationSent, setVerificationSent] = React.useState(false);
  const [resendLoading, setResendLoading] = React.useState(false);
  const [resendCooldown, setResendCooldown] = React.useState(0);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [googleUser, setGoogleUser] = React.useState<{ uid: string; email: string | null; name: string | null } | null>(null);
  const { showToast } = useToast();
  const [showGoogleRoleSelection, setShowGoogleRoleSelection] = React.useState(false);
  const [mfaResolver, setMfaResolver] = React.useState<any | null>(null);
  const [verificationId, setVerificationId] = React.useState<string | null>(null);
  const [verificationCode, setVerificationCode] = React.useState('');
  const [mfaError, setMfaError] = React.useState('');
  const [mfaSendingSms, setMfaSendingSms] = React.useState(false);
  const [mfaVerifying, setMfaVerifying] = React.useState(false);
  const [recaptchaVerifier, setRecaptchaVerifier] = React.useState<any | null>(null);
  const navigate = useNavigate();
  const { t } = useLanguage();

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResendEmail = async () => {
    if (resendCooldown > 0 || !auth.currentUser) return;

    setResendLoading(true);
    try {
      await sendEmailVerification(auth.currentUser);
      showToast(t('auth.resendSuccess') || 'Verification email resent!', 'success');
      setResendCooldown(60);
    } catch (err: any) {
      showToast(getAuthErrorMessage(err.code), 'error');
    } finally {
      setResendLoading(false);
    }
  };

  const getAuthErrorMessage = (code: string): string => {
    const errors: Record<string, string> = {
      'auth/wrong-password': t('error.wrongPassword'),
      'auth/user-not-found': t('error.userNotFound'),
      'auth/email-already-in-use': t('error.emailInUse'),
      'auth/too-many-requests': t('error.tooManyRequests'),
      'auth/network-request-failed': t('error.networkFailed'),
      'auth/invalid-credential': t('error.invalidCredential'),
      'auth/operation-not-allowed': 'Password reset is not enabled. Contact support.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/missing-email': 'Please enter your email address.'
    };
    return errors[code] || t('error.generic');
  };

  const getPasswordStrength = (p: string): 'weak' | 'fair' | 'strong' | null => {
    if (!p) return null;
    if (p.length < 6) return 'weak';
    
    const hasUpper = /[A-Z]/.test(p);
    const hasNumber = /[0-9]/.test(p);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(p);
    
    if (p.length >= 8 && hasUpper && hasNumber && hasSpecial) return 'strong';
    // 6-8 chars OR (>= 8 chars but missing one of the strong requirements)
    return 'fair';
  };

  const validatePhone = (value: string) => {
    const iraqiRegex = /^07\d{9}$/;
    if (!iraqiRegex.test(value)) {
      setPhoneError(t('error.invalidPhone'));
      return false;
    }
    setPhoneError('');
    return true;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!isLogin) {
      if (!validatePhone(phone)) return;
      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }

    setLoading(true);

    try {
      if (isLogin) {
        await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence).catch(() => console.warn('Persistence setting failed, using default'));
        
        let userCredential;
        try {
          userCredential = await signInWithEmailAndPassword(auth, email, password);
        } catch (signInErr: any) {
          if (signInErr.code === 'auth/multi-factor-auth-required') {
            const resolver = getMultiFactorResolver(auth, signInErr);
            setMfaResolver(resolver);
            
            const phoneHint = resolver.hints.find(
              (hint: any) => hint.factorId === PhoneMultiFactorGenerator.FACTOR_ID
            );
            
            if (phoneHint) {
              showToast('Phone verification (MFA) required.', 'info');
              setLoading(false);
              return;
            } else {
              throw signInErr;
            }
          } else {
            throw signInErr;
          }
        }
        
        const docSnap = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (docSnap.exists() && docSnap.data().active === false) {
          await auth.signOut();
          showToast('Your account has been suspended. Contact support.', 'error');
          setLoading(false);
          return;
        }
        navigate('/dashboard');
      } else {
        const normalizedEmail = email.trim().toLowerCase();
        const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        try {
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            name: displayName.trim(),
            phone: phonePrefix + phone,
            role,
            favorites: [],
            active: true,
            createdAt: new Date().toISOString()
          });
          try {
            await sendEmailVerification(userCredential.user);
          } catch (verificationErr) {
            console.warn('Failed to send verification email (likely not configured in Firebase), bypassing:', verificationErr);
          }
          navigate('/dashboard');
        } catch (firestoreError) {
          console.error('Firestore write failed during signup:', firestoreError);
          await deleteUser(userCredential.user);
          throw new Error('Account setup failed. Please try again.');
        }
      }
    } catch (err: any) {
      const msg = getAuthErrorMessage(err.code);
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMfaSms = async () => {
    if (!mfaResolver) return;
    setMfaSendingSms(true);
    setMfaError('');
    try {
      let verifier = recaptchaVerifier;
      if (!verifier) {
        verifier = new RecaptchaVerifier(auth, 'recaptcha-container-id', {
          size: 'invisible',
          callback: () => {
            // reCAPTCHA solved
          }
        });
        setRecaptchaVerifier(verifier);
      }

      const phoneHint = mfaResolver.hints.find(
        (hint: any) => hint.factorId === PhoneMultiFactorGenerator.FACTOR_ID
      );
      if (!phoneHint) {
        throw new Error('No phone verification hint found.');
      }

      const phoneInfoOptions = {
        multiFactorHint: phoneHint,
        session: mfaResolver.session
      };

      const phoneAuthProvider = new PhoneAuthProvider(auth);
      const mfaVerificationId = await phoneAuthProvider.verifyPhoneNumber(
        phoneInfoOptions,
        verifier
      );

      setVerificationId(mfaVerificationId);
      showToast('Verification code sent!', 'success');
    } catch (err: any) {
      console.error('Error sending SMS verification:', err);
      const msg = err.message || 'Failed to send SMS code. Please try again.';
      setMfaError(msg);
      showToast(msg, 'error');
    } finally {
      setMfaSendingSms(false);
    }
  };

  const handleVerifyMfaCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaResolver || !verificationId || !verificationCode) return;

    setMfaVerifying(true);
    setMfaError('');
    try {
      const cred = PhoneAuthProvider.credential(verificationId, verificationCode);
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);
      
      const userCredential = await mfaResolver.resolveSignIn(multiFactorAssertion);
      
      const docSnap = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (docSnap.exists() && docSnap.data().active === false) {
        await auth.signOut();
        showToast('Your account has been suspended. Contact support.', 'error');
        setMfaResolver(null);
        setVerificationId(null);
        setVerificationCode('');
        return;
      }
      
      showToast('Successfully signed in!', 'success');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Error verifying MFA code:', err);
      let errMsg = 'Invalid verification code. Please check and try again.';
      if (err.code === 'auth/invalid-verification-code') {
        errMsg = 'The verification code you entered is invalid.';
      } else if (err.code === 'auth/code-expired') {
        errMsg = 'The verification code has expired. Please request a new one.';
      }
      setMfaError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setMfaVerifying(false);
    }
  };

  const handleMfaCancel = () => {
    setMfaResolver(null);
    setVerificationId(null);
    setVerificationCode('');
    setMfaError('');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      showToast('Please enter your email', 'info');
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      showToast('Password reset email sent', 'success');
      setResetSent(true);
    } catch (err: any) {
      console.error('Password reset error:', err.code, err.message);
      showToast(getAuthErrorMessage(err.code), 'error');
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence).catch(() => console.warn('Persistence setting failed, using default'));
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
      const docSnap = await getDoc(doc(db, 'users', result.user.uid));
      
      if (!docSnap.exists()) {
        setGoogleUser({
          uid: result.user.uid,
          email: result.user.email,
          name: result.user.displayName
        });
        setShowGoogleRoleSelection(true);
      } else {
        if (docSnap.data().active === false) {
          await auth.signOut();
          showToast('Your account has been suspended. Contact support.', 'error');
          return;
        }
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code));
    }
  };

  const handleCompleteGoogleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleUser) return;
    
    if (!validatePhone(phone)) return;

    setLoading(true);
    try {
      await setDoc(doc(db, 'users', googleUser.uid), {
        uid: googleUser.uid,
        email: googleUser.email,
        name: (googleUser.name || '').trim(),
        phone: phonePrefix + phone,
        role,
        active: true,
        createdAt: new Date().toISOString()
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  if (showGoogleRoleSelection && googleUser) {
    return (
      <div className="max-w-md mx-auto mt-8 sm:mt-16">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-stone-100 space-y-8">
          <div className="text-center space-y-2">
            <ShieldCheck className="w-12 h-12 text-orange-700 mx-auto" />
            <h2 className="text-3xl font-bold text-stone-900">{t('auth.completeProfile')}</h2>
            <p className="text-stone-500">{t('auth.selectRoleSub')}</p>
          </div>

          <form onSubmit={handleCompleteGoogleAuth} className="space-y-6">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-stone-700">{t('auth.phone')}</label>
              <div className="relative">
                <Phone className="absolute start-3 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                <input 
                  type="tel" 
                  required 
                  className={`w-full ps-10 pe-4 py-3 rounded-xl border focus:ring-2 focus:ring-orange-500 outline-none transition-colors text-base md:text-sm ${
                    phoneError ? 'border-red-500' : 'border-stone-200'
                  }`}
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setPhone(val);
                    if (val) validatePhone(val);
                  }}
                  placeholder="07xx-xxx-xxxx"
                />
              </div>
              {phoneError && <p className="text-red-500 text-xs font-medium ps-1 mt-1">{phoneError}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-700">{t('auth.roleLabel')}</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'customer', icon: User, label: t('auth.customer') },
                  { id: 'owner', icon: Store, label: t('auth.owner') }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRole(item.id as any)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                      role === item.id 
                        ? 'bg-orange-50 border-orange-500 text-orange-700' 
                        : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-red-600 text-sm font-medium">{error}</p>}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-orange-700 text-white py-3 rounded-xl font-bold hover:bg-orange-800 transition-colors disabled:opacity-50"
            >
              {loading ? t('auth.processing') : t('auth.finish')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-8 sm:mt-16">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-stone-100 space-y-8">
        <div className="text-center space-y-2">
          <Croissant className="w-12 h-12 text-orange-700 mx-auto" />
          <h2 className="text-3xl font-bold text-stone-900">
            {isForgotPassword ? t('auth.resetPassword') : (isLogin ? t('auth.welcome') : t('auth.join'))}
          </h2>
          <p className="text-stone-500">
            {isForgotPassword ? t('auth.resetSub') : t('auth.sub')}
          </p>
        </div>

        {verificationSent ? (
          <div className="p-6 bg-green-50 rounded-2xl border border-green-100 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-green-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-green-900">{t('auth.verifyEmailTitle')}</h3>
              <p className="text-sm text-green-800 leading-relaxed font-medium">
                {t('auth.verifyEmailSent')} <span className="font-bold underline-green-200 decoration-2">{email}</span>.
              </p>
              <p className="text-xs text-green-700/80 font-medium">
                {t('auth.verifyEmailInstructions')}
              </p>
            </div>
            <button 
              onClick={() => {
                setVerificationSent(false);
                setIsLogin(true);
              }}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors"
            >
              {t('auth.backToSignIn')}
            </button>
            <button 
              onClick={handleResendEmail}
              disabled={resendLoading || resendCooldown > 0}
              className="w-full border border-green-200 text-green-700 py-3 rounded-xl font-bold hover:bg-green-100/50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {resendLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {resendCooldown > 0 
                ? `${t('auth.resendIn')} ${resendCooldown}s` 
                : t('auth.resendEmail')}
            </button>
          </div>
        ) : mfaResolver ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 space-y-3 text-center">
              <div className="bg-orange-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-orange-700 animate-pulse">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-stone-900">Two-Factor Verification</h3>
              <p className="text-xs text-stone-600 leading-relaxed max-w-sm mx-auto">
                Please verify your identity using the phone number associated with your account:
                <span className="block mt-2 font-bold text-stone-900 text-sm tracking-wide bg-white/60 py-1.5 px-3 rounded-lg border border-orange-100 inline-block font-mono">
                  {mfaResolver.hints.find((h: any) => h.factorId === PhoneMultiFactorGenerator.FACTOR_ID)?.phoneNumber || 'Registered Phone Number'}
                </span>
              </p>
            </div>

            {mfaError && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl font-medium">
                {mfaError}
              </div>
            )}

            {/* reCAPTCHA container required for Phone Auth verification */}
            <div id="recaptcha-container-id" className="flex justify-center my-2"></div>

            {!verificationId ? (
              <button
                type="button"
                onClick={handleSendMfaSms}
                disabled={mfaSendingSms}
                className="w-full bg-orange-700 text-white py-3 rounded-xl font-bold hover:bg-orange-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {mfaSendingSms ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending SMS...
                  </>
                ) : (
                  <>
                    Send Verification SMS
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <form onSubmit={handleVerifyMfaCode} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-stone-700">6-Digit Verification Code</label>
                  <div className="relative">
                    <KeyRound className="absolute start-3 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      pattern="\d{6}"
                      placeholder="123456"
                      className="w-full ps-10 pe-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none text-center font-bold tracking-widest text-lg"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={mfaVerifying || !verificationCode}
                  className="w-full bg-orange-700 text-white py-3 rounded-xl font-bold hover:bg-orange-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {mfaVerifying ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify & Sign In
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSendMfaSms}
                  disabled={mfaSendingSms}
                  className="w-full text-xs text-orange-700 font-bold hover:text-orange-800 transition-colors text-center block"
                >
                  {mfaSendingSms ? 'Sending new code...' : 'Resend Verification SMS'}
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={handleMfaCancel}
              className="w-full text-stone-500 text-sm font-bold hover:text-stone-700 transition-colors text-center block py-1"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <>
            {isForgotPassword ? (
              resetSent ? (
                <div className="p-6 bg-green-50 rounded-2xl border border-green-100 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-green-600">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-bold text-green-900">Check Your Inbox</h3>
                    <p className="text-sm text-green-800 leading-relaxed font-medium">
                      A password reset link has been sent to <span className="font-bold underline-green-200 decoration-2">{resetEmail}</span>.
                    </p>
                    <p className="text-xs text-green-700/80 font-medium">
                      Be sure to check your spam folder if you do not receive the email in a few minutes.
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      setResetSent(false);
                      setIsForgotPassword(false);
                    }}
                    className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors"
                  >
                    {t('auth.backToSignIn') || 'Back to Sign In'}
                  </button>
                  <button 
                    onClick={() => setResetSent(false)}
                    className="w-full border border-green-200 text-green-700 py-2 rounded-xl font-semibold hover:bg-green-100/50 transition-colors"
                  >
                    Send to another email
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 space-y-3">
                    <div className="flex items-center gap-2 text-orange-800">
                      <KeyRound className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">{t('auth.forgotPassword')}</span>
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed font-medium">
                      {t('auth.resetNote')}
                    </p>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-stone-700">{t('auth.email')}</label>
                      <div className="relative">
                        <Mail className="absolute start-3 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                        <input 
                          type="email" 
                          required 
                          placeholder="name@example.com"
                          className="w-full ps-10 pe-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    type="submit"
                    disabled={resetLoading}
                    className="w-full bg-orange-700 text-white py-3 rounded-xl font-bold hover:bg-orange-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {resetLoading ? t('auth.sending') : t('auth.sendResetEmail')}
                    {!resetLoading && <ChevronRight className="w-4 h-4" />}
                  </button>

                  <button 
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setResetSent(false);
                    }}
                    className="w-full text-stone-500 text-sm font-bold hover:text-stone-700 transition-colors"
                  >
                    {t('auth.backToLogin')}
                  </button>
                </form>
              )
            ) : (
              <form onSubmit={handleAuth} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-stone-700">{t('auth.fullName')}</label>
                    <div className="relative">
                      <User className="absolute start-3 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                      <input 
                        type="text" 
                        required 
                        minLength={2}
                        maxLength={60}
                        className="w-full ps-10 pe-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {!isLogin && (
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-stone-700">{t('auth.phone')}</label>
                    <div className="relative">
                      <Phone className="absolute start-3 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                      <input 
                        type="tel" 
                        required 
                        className={`w-full ps-10 pe-4 py-3 rounded-xl border focus:ring-2 focus:ring-orange-500 outline-none transition-colors text-base md:text-sm ${
                          phoneError ? 'border-red-500' : 'border-stone-200'
                        }`}
                        value={phone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setPhone(val);
                          if (val) validatePhone(val);
                        }}
                        placeholder="07xx-xxx-xxxx"
                      />
                    </div>
                    {phoneError && <p className="text-red-500 text-xs font-medium ps-1 mt-1">{phoneError}</p>}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-stone-700">{t('auth.email')}</label>
                  <div className="relative">
                    <Mail className="absolute start-3 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                    <input 
                      type="email" 
                      required 
                      className="w-full ps-10 pe-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-stone-700">{t('auth.password')}</label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      required 
                      minLength={isLogin ? undefined : 8}
                      className="w-full ps-10 pe-12 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {!isLogin && (
                    <div className="space-y-2 mt-2 px-1">
                      <div className="flex gap-1 h-1.5">
                        {[1, 2, 3].map((level) => {
                          const strength = getPasswordStrength(password);
                          const isActive = strength === 'weak' ? level === 1 : 
                                         strength === 'fair' ? level <= 2 : 
                                         strength === 'strong' ? level <= 3 : false;
                          const colorClass = strength === 'weak' ? 'bg-red-500' :
                                           strength === 'fair' ? 'bg-amber-500' :
                                           strength === 'strong' ? 'bg-green-500' : 'bg-stone-100';
                          
                          return (
                            <div 
                              key={level}
                              className={`flex-1 rounded-full transition-all duration-300 ${isActive ? colorClass : 'bg-stone-100'}`}
                            />
                          );
                        })}
                      </div>
                      <p className={`text-[10px] font-black uppercase tracking-wider ${
                        getPasswordStrength(password) === 'weak' ? 'text-red-500' :
                        getPasswordStrength(password) === 'fair' ? 'text-amber-600' :
                        getPasswordStrength(password) === 'strong' ? 'text-green-600' : 'text-stone-400'
                      }`}>
                        {password ? (getPasswordStrength(password) === 'weak' ? 'Weak password' : 
                                   getPasswordStrength(password) === 'fair' ? 'Fairly strong' : 'Strong password') : 'Enter password'}
                      </p>
                    </div>
                  )}
                  {isLogin && (
                    <div className="flex items-center justify-between px-1">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            className="peer sr-only"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                          />
                          <div className="w-5 h-5 rounded border border-stone-200 bg-white peer-checked:bg-orange-700 peer-checked:border-orange-700 transition-all flex items-center justify-center">
                            <CheckCircle2 className={`w-3.5 h-3.5 text-white transition-opacity ${rememberMe ? 'opacity-100' : 'opacity-0'}`} />
                          </div>
                        </div>
                        <span className="text-xs font-bold text-stone-500 group-hover:text-stone-700 transition-colors uppercase tracking-wider">
                          {t('auth.rememberMe')}
                        </span>
                      </label>
                      
                      <button 
                        type="button" 
                        onClick={() => {
                          setIsForgotPassword(true);
                          setResetEmail(email);
                          setResetSent(false);
                        }}
                        className="text-xs font-bold text-orange-700 hover:underline transition-colors uppercase tracking-wider"
                      >
                        {t('auth.forgotPassword')}
                      </button>
                    </div>
                  )}
                </div>

                {!isLogin && (
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-stone-700">{t('auth.confirmPassword')}</label>
                    <div className="relative">
                      <Lock className="absolute start-3 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                      <input 
                        type={showConfirmPassword ? 'text' : 'password'} 
                        required 
                        className="w-full ps-10 pe-12 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute end-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 focus:outline-none"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                )}

                {!isLogin && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700">{t('auth.roleLabel')}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'customer', icon: User, label: t('auth.customer') },
                        { id: 'owner', icon: Store, label: t('auth.owner') }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setRole(item.id as any)}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                            role === item.id 
                              ? 'bg-orange-50 border-orange-500 text-orange-700' 
                              : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                          }`}
                        >
                          <item.icon className="w-5 h-5" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {error && <p className="text-red-600 text-sm font-medium">{error}</p>}

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-orange-700 text-white py-3 rounded-xl font-bold hover:bg-orange-800 transition-colors disabled:opacity-50"
                >
                  {loading ? t('auth.processing') : isLogin ? t('auth.signIn') : t('auth.createAccount')}
                </button>
              </form>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-200"></div></div>
              <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-stone-500">{t('auth.orContinue')}</span></div>
            </div>

            <button 
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 border border-stone-200 py-3 rounded-xl font-semibold hover:bg-stone-50 transition-colors"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
              Google
            </button>

            <p className="text-center text-stone-600">
              {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}{' '}
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-orange-700 font-bold hover:underline"
              >
                {isLogin ? t('auth.signUp') : t('auth.signIn')}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Auth;
