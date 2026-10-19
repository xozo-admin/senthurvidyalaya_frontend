// src/components/auth/LoginForm/index.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { LoginFormFields } from './LoginFormFields';
import { OTPForm } from './OTPForm';
import { ForgotPasswordDialog } from './ForgotPasswordDialog';
import { LoginData } from '@/types';
// Import toast functions
import {
  toastInfo,
  toastError,
  toastSuccess,
  toastWarning
} from '@/lib/toast';

import { useRouter } from 'next/navigation';

interface LoginFormProps {
  onSubmit?: (data: LoginData) => void;
}

export const LoginForm = ({ onSubmit }: LoginFormProps) => {

  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{
    username?: string;
    password?: string;
  }>({});
  const [loginStep, setLoginStep] = useState<'initial' | 'otp'>('initial');
  const [otp, setOtp] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const otpTimerStartedRef = useRef(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'otp' | 'password'>('request');
  const [resetUsername, setResetUsername] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const resetOtpFlow = () => {
    otpTimerStartedRef.current = false;
    setOtp('');
    setTimeLeft(0);
    setLoginStep('initial');
  };

  const startOtpFlow = () => {
    otpTimerStartedRef.current = true;
    setOtp('');
    setTimeLeft(300);
    setLoginStep('otp');
  };

  // OTP Countdown Timer
  useEffect(() => {
    if (loginStep === 'otp' && otpTimerStartedRef.current && timeLeft === 0) {
      toastError('OTP has expired. Please login again.');
      resetOtpFlow();
    }
  }, [loginStep, timeLeft]);

  useEffect(() => {
    if (loginStep !== 'otp') return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [loginStep]);




  const handleSuccessfulLogin = (data: any) => {
    if (!data.token) {
      toastError('No token received');
      return;
    }

    toastSuccess(`Welcome back, ${data.user_type}!`);

    const enrichedData = {
      ...data,
      username: data.username || username,
      staff_role: data.staff_role || undefined,
    };

    // Cookie-based login
    login(enrichedData, rememberMe);

    setTimeout(() => {
      if (data.user_type === 'super_admin') {
        router.push('/admin');
        return;
      }
      if (data.user_type === 'staff') {
        router.push('/staff');
        return;
      }
      router.push(`/${data.user_type}`);
    }, 1500);
  };


  const resetForgotPasswordFlow = () => {
    setResetStep('request');
    setResetOtp('');
    setResetNewPassword('');
    setResetConfirmPassword('');
    setResetMessage('');
    setResetLoading(false);
  };

  const getApiErrorMessage = (error: any, fallback: string) => (
    error.response?.data?.error ||
    error.response?.data?.message ||
    error.response?.data?.detail ||
    error.message ||
    fallback
  );

  const handleForgotPassword = () => {
    resetForgotPasswordFlow();
    setResetUsername(username.trim());
    setForgotPasswordOpen(true);
  };

  const handleCloseForgotPassword = () => {
    if (resetLoading) return;
    setForgotPasswordOpen(false);
    resetForgotPasswordFlow();
  };

  const handleRequestPasswordResetOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedUsername = resetUsername.trim();
    if (!trimmedUsername) {
      toastWarning('Please enter your username or phone number');
      return;
    }

    setResetLoading(true);
    setResetMessage('');

    try {
      const response = await api.passwordReset.request({
        username: trimmedUsername,
        method: 'email',
      });

      const debugOtp = response.data?.debug_otp;
      const message = debugOtp
        ? `${response.data?.message || 'OTP generated.'} Development OTP: ${debugOtp}`
        : response.data?.message || 'OTP sent successfully.';
      setResetUsername(trimmedUsername);
      setResetMessage(message);
      setResetStep('otp');
      toastSuccess(message);
    } catch (error: any) {
      const errorMessage = getApiErrorMessage(error, 'Failed to send password reset OTP.');
      toastError(errorMessage);
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyPasswordResetOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!resetOtp.trim()) {
      toastWarning('Please enter the OTP');
      return;
    }

    setResetLoading(true);
    setResetMessage('');

    try {
      const response = await api.passwordReset.verifyOtp({
        username: resetUsername.trim(),
        otp: resetOtp.trim(),
      });

      const message = response.data?.message || 'OTP verified successfully.';
      setResetMessage(message);
      setResetStep('password');
      toastSuccess(message);
    } catch (error: any) {
      const errorMessage = getApiErrorMessage(error, 'Failed to verify OTP.');
      toastError(errorMessage);
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmPasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!resetNewPassword.trim()) {
      toastWarning('Please enter a new password');
      return;
    }

    if (resetNewPassword.length < 6) {
      toastWarning('Password must be at least 6 characters');
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      toastWarning('Passwords do not match');
      return;
    }

    setResetLoading(true);
    setResetMessage('');

    try {
      const response = await api.passwordReset.confirm({
        username: resetUsername.trim(),
        otp: resetOtp.trim(),
        new_password: resetNewPassword,
        confirm_password: resetConfirmPassword,
      });

      const message = response.data?.message || 'Password changed successfully.';
      toastSuccess(message);
      setForgotPasswordOpen(false);
      resetForgotPasswordFlow();
      setPassword('');
    } catch (error: any) {
      const errorMessage = getApiErrorMessage(error, 'Failed to update password.');
      toastError(errorMessage);
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent multiple submissions
    if (isLoading) return;

    setIsLoading(true);
    setApiResponse(null);

    // OTP verification step
    if (loginStep === 'otp') {
      if (timeLeft <= 0) {
        toastError('OTP Expired');
        resetOtpFlow();
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.auth.verifyOtp({ username: username.trim(), otp: otp.trim() });
        const data = response.data;

        const otpVerified =
          !!data.token &&
          !!data.session_key &&
          !!data.user_type;

        if (otpVerified) {
          toastSuccess('OTP verified successfully!');
          handleSuccessfulLogin(data);
        } else {
          const errorMessage = data.error || data.message || 'Invalid OTP';
          toastError(errorMessage);
          console.error('❌ OTP verification failed:', errorMessage);

          // 🔁 Go back to login form
          resetOtpFlow();
        }
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          'Something went wrong. Please try again.';

        toastError(errorMessage);
        resetOtpFlow();
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Initial login validation
    const newErrors: any = {};

    if (!username.trim()) {
      newErrors.username = 'Please enter your username';
    } else if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!password.trim()) {
      newErrors.password = 'Please enter your password';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setIsLoading(false);

      return;
    }

    try {
      const response = await api.auth.login({ username: username.trim(), password });
      const data = response.data;
      setApiResponse(data);

      const isTwoFactorRequired = data.status === '2FA_REQUIRED';
      const isFinalizedLogin =
        !!data.token &&
        !!data.session_key &&
        !!data.user_type;

      if (isTwoFactorRequired) {
        toastInfo('OTP sent successfully. Please enter the 4-digit code.');
        startOtpFlow();
      } else if (isFinalizedLogin) {
        toastSuccess('Login successful!');
        handleSuccessfulLogin(data);
      } else {
        const errorMessage = data.error || data.message || 'Login failed';
        toastError(errorMessage);
        console.error('❌ Login failed:', errorMessage);
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Something went wrong. Please try again.';

      toastError(errorMessage);
        console.error('Login request failed:', error.response?.status || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={loginStep}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          {loginStep === 'otp' ? (
            <OTPForm
              username={username}
              otp={otp}
              timeLeft={timeLeft}
              isLoading={isLoading}
              onOtpChange={setOtp}
              onBackToLogin={() => {
                setLoginStep('initial');
                setOtp('');
                toastInfo('Returned to login form');
              }}
            />
          ) : (
            <LoginFormFields
              username={username}
              password={password}
              rememberMe={rememberMe}
              errors={errors}
              isLoading={isLoading}
              onUsernameChange={setUsername}
              onPasswordChange={setPassword}
              onRememberMeChange={setRememberMe}
              onForgotPassword={handleForgotPassword}
              onShowPasswordToggle={() => setShowPassword(!showPassword)}
              showPassword={showPassword}
            />
          )}
        </form>

        <ForgotPasswordDialog
          isOpen={forgotPasswordOpen}
          step={resetStep}
          username={resetUsername}
          otp={resetOtp}
          newPassword={resetNewPassword}
          confirmPassword={resetConfirmPassword}
          isLoading={resetLoading}
          message={resetMessage}
          onClose={handleCloseForgotPassword}
          onUsernameChange={setResetUsername}
          onOtpChange={setResetOtp}
          onNewPasswordChange={setResetNewPassword}
          onConfirmPasswordChange={setResetConfirmPassword}
          onRequestOtp={handleRequestPasswordResetOtp}
          onVerifyOtp={handleVerifyPasswordResetOtp}
          onConfirmPassword={handleConfirmPasswordReset}
          onBackToRequest={() => {
            setResetStep('request');
            setResetOtp('');
            setResetMessage('');
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
};
