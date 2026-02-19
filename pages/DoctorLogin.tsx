import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { queueService } from '../services/queueService';
import { Activity, Stethoscope, AlertTriangle } from 'lucide-react';

export const DoctorLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    const existing = queueService.getDoctorSession();
    if (existing) {
      navigate('/doctor/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setError(null);
    setLoading(true);
    try {
      const session = await queueService.doctorLogin(email.trim(), password);
      if (!session) {
        setError('Invalid email or password.');
        setLoading(false);
        return;
      }
      navigate('/doctor/dashboard', { replace: true });
    } catch {
      setError('Login failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-6 py-4 flex items-center gap-2.5">
        <button onClick={() => navigate('/')} className="flex items-center gap-2.5" type="button">
          <div className="h-9 w-9 bg-primary text-primary-foreground rounded-md flex items-center justify-center font-bold text-lg">
            G
          </div>
          <span className="text-lg font-bold text-foreground tracking-tight">Gravity</span>
        </button>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="icon-circle icon-circle-brand mb-4" style={{ width: 56, height: 56 }}>
              <Stethoscope size={26} />
            </div>
            <h1 className="text-xl font-bold text-foreground">Doctor Login</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to access your patient queue.</p>
          </div>

          {error && (
            <div className="alert alert-error mb-4">
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="doc-email" className="block text-sm font-semibold text-foreground mb-1.5">Email</label>
              <input
                id="doc-email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                placeholder="doctor@hospital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="doc-pass" className="block text-sm font-semibold text-foreground mb-1.5">Password</label>
              <input
                id="doc-pass"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="btn-primary w-full justify-center py-3"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-6">
            Doctor accounts are created by hospital administrators.
          </p>
        </div>
      </div>
    </div>
  );
};
