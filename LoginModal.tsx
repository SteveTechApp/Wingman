import React, { useState } from 'react';
import InfoModal from './InfoModal';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

type AuthMode = 'login' | 'register' | 'reset';

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    company: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        await authService.login(formData.email, formData.password);
        toast.success('Welcome back!');
        onLoginSuccess();
        onClose();
      } else if (mode === 'register') {
        if (formData.password !== formData.confirmPassword) {
          toast.error('Passwords do not match');
          setLoading(false);
          return;
        }
        await authService.register(
          formData.email,
          formData.password,
          formData.name,
          formData.company
        );
        toast.success('Account created successfully!');
        onLoginSuccess();
        onClose();
      } else if (mode === 'reset') {
        await authService.requestPasswordReset(formData.email);
        toast.success('Password reset email sent! (Check your email)');
        setMode('login');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      company: ''
    });
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    resetForm();
  };

  const renderForm = () => {
    if (mode === 'login') {
      return (
        <>
          <div>
            <label className="block text-xs font-bold mb-1 text-text-secondary uppercase">
              Email Address
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              className="w-full p-3 rounded-lg border border-border-color bg-input-bg focus:ring-2 focus:ring-accent outline-none"
              placeholder="jane@example.com"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 text-text-secondary uppercase">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              className="w-full p-3 rounded-lg border border-border-color bg-input-bg focus:ring-2 focus:ring-accent outline-none"
              placeholder="••••••••"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>
          <div className="flex justify-between items-center text-sm">
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" />
              Remember me
            </label>
            <button
              type="button"
              onClick={() => switchMode('reset')}
              className="text-accent hover:underline"
            >
              Forgot password?
            </button>
          </div>
        </>
      );
    } else if (mode === 'register') {
      return (
        <>
          <div>
            <label className="block text-xs font-bold mb-1 text-text-secondary uppercase">
              Full Name
            </label>
            <input
              type="text"
              required
              autoComplete="name"
              className="w-full p-3 rounded-lg border border-border-color bg-input-bg focus:ring-2 focus:ring-accent outline-none"
              placeholder="Jane Doe"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 text-text-secondary uppercase">
              Company
            </label>
            <input
              type="text"
              className="w-full p-3 rounded-lg border border-border-color bg-input-bg focus:ring-2 focus:ring-accent outline-none"
              placeholder="Acme Integrators (optional)"
              value={formData.company}
              onChange={e => setFormData({...formData, company: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 text-text-secondary uppercase">
              Email Address
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              className="w-full p-3 rounded-lg border border-border-color bg-input-bg focus:ring-2 focus:ring-accent outline-none"
              placeholder="jane@example.com"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 text-text-secondary uppercase">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              className="w-full p-3 rounded-lg border border-border-color bg-input-bg focus:ring-2 focus:ring-accent outline-none"
              placeholder="••••••••"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
            <p className="text-xs text-text-secondary mt-1">
              Minimum 8 characters
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 text-text-secondary uppercase">
              Confirm Password
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              className="w-full p-3 rounded-lg border border-border-color bg-input-bg focus:ring-2 focus:ring-accent outline-none"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
            />
          </div>
        </>
      );
    } else {
      return (
        <div>
          <label className="block text-xs font-bold mb-1 text-text-secondary uppercase">
            Email Address
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            className="w-full p-3 rounded-lg border border-border-color bg-input-bg focus:ring-2 focus:ring-accent outline-none"
            placeholder="jane@example.com"
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
          />
          <p className="text-sm text-text-secondary mt-2">
            We'll send you instructions to reset your password.
          </p>
        </div>
      );
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Welcome Back';
      case 'register': return 'Create Account';
      case 'reset': return 'Reset Password';
    }
  };

  const getButtonText = () => {
    switch (mode) {
      case 'login': return 'Sign In';
      case 'register': return 'Create Account';
      case 'reset': return 'Send Reset Link';
    }
  };

  const footer = (
    <div className="space-y-3">
      <button
        type="submit"
        form="auth-form"
        disabled={loading}
        className="w-full btn btn-primary text-lg disabled:opacity-50"
      >
        {loading ? 'Please wait...' : getButtonText()}
      </button>
      
      {mode === 'login' && (
        <p className="text-center text-sm text-text-secondary">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={() => switchMode('register')}
            className="text-accent hover:underline font-medium"
          >
            Sign up
          </button>
        </p>
      )}
      
      {mode === 'register' && (
        <p className="text-center text-sm text-text-secondary">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => switchMode('login')}
            className="text-accent hover:underline font-medium"
          >
            Sign in
          </button>
        </p>
      )}
      
      {mode === 'reset' && (
        <p className="text-center text-sm text-text-secondary">
          Remember your password?{' '}
          <button
            type="button"
            onClick={() => switchMode('login')}
            className="text-accent hover:underline font-medium"
          >
            Back to login
          </button>
        </p>
      )}
    </div>
  );

  return (
    <InfoModal
      isOpen={isOpen}
      onClose={onClose}
      title={getTitle()}
      className="max-w-md"
      footer={footer}
    >
      <div className="text-center mb-6">
        <div className="mx-auto w-16 h-16 bg-accent-bg-subtle rounded-full flex items-center justify-center mb-4">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-8 w-8 text-accent" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            {mode === 'reset' ? (
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            ) : (
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            )}
          </svg>
        </div>
        <p className="text-text-secondary">
          {mode === 'login' && 'Sign in to access your projects and settings'}
          {mode === 'register' && 'Create an account to save your projects securely'}
          {mode === 'reset' && 'Enter your email to receive reset instructions'}
        </p>
      </div>

      <form id="auth-form" onSubmit={handleSubmit} className="space-y-4">
        {renderForm()}
      </form>
    </InfoModal>
  );
};

export default LoginModal;
