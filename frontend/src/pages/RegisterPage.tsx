import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Zap, Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', username: '', password: '', displayName: '' });
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.username || !form.password) return toast.error('All fields required');
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters');
    setIsLoading(true);
    try {
      await register(form);
      toast.success('Account created! Welcome to PollMaster 🎉');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pm-darker flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-pm-purple/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 bg-pm-red rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-3xl tracking-wide">POLLMASTER</span>
          </Link>
          <h1 className="text-2xl font-bold text-pm-text">Create your account</h1>
          <p className="text-pm-muted text-sm mt-1">Start hosting polls in minutes</p>
        </div>

        <div className="pm-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-pm-muted uppercase tracking-wider mb-2">Display Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pm-muted" />
                  <input type="text" value={form.displayName} onChange={handleChange('displayName')} className="pm-input pl-10" placeholder="John Doe" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-pm-muted uppercase tracking-wider mb-2">Username <span className="text-pm-red">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-pm-muted text-sm">@</span>
                  <input type="text" value={form.username} onChange={handleChange('username')} className="pm-input pl-7" placeholder="johndoe" required />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-pm-muted uppercase tracking-wider mb-2">Email <span className="text-pm-red">*</span></label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pm-muted" />
                <input type="email" value={form.email} onChange={handleChange('email')} className="pm-input pl-10" placeholder="you@example.com" required />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-pm-muted uppercase tracking-wider mb-2">Password <span className="text-pm-red">*</span></label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pm-muted" />
                <input type={showPass ? 'text' : 'password'} value={form.password} onChange={handleChange('password')} className="pm-input pl-10 pr-10" placeholder="Min. 8 characters" required />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-pm-muted hover:text-pm-text transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="pm-btn-primary w-full flex items-center justify-center gap-2 py-3 mt-2">
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Create Account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-pm-muted text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-pm-red hover:text-pm-text font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
