import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, X, Loader2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

interface AuthProps {
  isOpen: boolean;
  onClose: () => void;
}

const Auth: React.FC<AuthProps> = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return false;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
          options: {
            data: {
              is_admin: isAdmin
            }
          }
        });

        if (error) {
          if (error.message.includes('Invalid login')) {
            throw new Error('Invalid email or password');
          }
          throw error;
        }

        if (data?.user) {
          toast.success(`Welcome back${isAdmin ? ' Administrator' : ''}!`);
          onClose();
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              is_admin: isAdmin,
              full_name: '',
              avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${email}`
            }
          }
        });

        if (error) throw error;

        if (data.user?.identities?.length === 0) {
          toast.error('An account with this email already exists');
        } else {
          toast.success('Please check your email to confirm your account');
          onClose();
        }
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm shadow-sm placeholder-gray-400
                focus:outline-none focus:border-park-primary focus:ring-1 focus:ring-park-primary"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm shadow-sm placeholder-gray-400
                focus:outline-none focus:border-park-primary focus:ring-1 focus:ring-park-primary"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isAdmin"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              className="rounded border-gray-300 text-park-primary focus:ring-park-primary"
            />
            <label htmlFor="isAdmin" className="text-sm text-gray-700 flex items-center">
              <ShieldCheck className="w-4 h-4 mr-1 text-park-primary" />
              Login as Administrator
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
              bg-park-primary hover:bg-park-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-park-primary
              disabled:opacity-50 disabled:cursor-not-allowed transition-colors
              ${loading ? 'bg-park-primary/70' : ''}`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isLogin ? 'Signing in...' : 'Creating account...'}
              </>
            ) : (
              <>
                {isLogin ? (
                  <LogIn className="w-4 h-4 mr-2" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                {isLogin ? 'Sign In' : 'Create Account'}
              </>
            )}
          </button>
        </form>

        <div className="mt-6">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="w-full text-sm text-park-primary hover:text-park-dark text-center font-medium"
          >
            {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;