import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { Card, CardBody } from '../components/ui/Card';
import { Activity } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const navigate = useNavigate();
  const { register, isLoading, error, clearError, isAuthenticated } = useAuthStore();

  useEffect(() => {
    clearError();
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const success = await register(email, password, fullName, phone);
    if (success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card variant="glass" className="w-full max-w-md border-indigo-500/10 glow-violet">
        <CardBody className="pt-8">
          {/* Logo brand */}
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-indigo-50 border border-indigo-200/50 rounded-2xl text-indigo-600">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
          </div>

          <h1 className="text-2xl font-extrabold text-center text-slate-800 mb-1">Create Account</h1>
          <p className="text-center text-slate-400 text-sm mb-6">Register a clinical patient profile</p>

          {error && <Alert type="error" onClose={clearError} className="mb-4">{error}</Alert>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Phone Number"
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              className="w-full py-3 mt-6"
              isLoading={isLoading}
            >
              Register
            </Button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 hover:text-indigo-500 font-bold transition-colors">
              Sign In
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
};

