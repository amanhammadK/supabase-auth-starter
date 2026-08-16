import { useState, useEffect } from 'react';
import { createClient, Session } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);
const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as unknown as ReturnType<typeof createClient>);

type Mode = 'login' | 'signup';

export default function AuthApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [notConfigured] = useState(!isConfigured);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError('');
    setMessage('');

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setMessage('Check your email to confirm your account. You can also sign in with your password below.');
        setMode('login');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      }
    }
    setLoading(false);
  };

  const signInWithGoogle = async () => {
    if (!supabase) return;
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) setError(error.message);
  };

  const sendMagicLink = async () => {
    if (!supabase) return;
    if (!email) {
      setError('Enter your email address first.');
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setMessage('Magic link sent! Check your inbox.');
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.7rem 0.8rem', border: '1px solid #e2e8f0', borderRadius: 8,
    fontSize: '0.9rem', boxSizing: 'border-box', marginBottom: '0.85rem', background: '#fff',
  };

  if (notConfigured) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: '2.5rem', maxWidth: 420, width: '100%' }}>
          <h1 style={{ fontSize: '1.4rem', margin: '0 0 0.75rem' }}>Supabase not configured</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 1rem' }}>
            Add your Supabase project URL and anon key to a <code style={{ background: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: 4 }}>.env.local</code> file:
          </p>
          <pre style={{ background: '#0f172a', color: '#a5f3fc', padding: '1rem', borderRadius: 8, fontSize: '0.8rem', overflowX: 'auto', margin: '0 0 1rem' }}>
{`NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key`}
          </pre>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>See README for full setup instructions.</p>
        </div>
      </div>
    );
  }

  if (session?.user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: '2.5rem', maxWidth: 420, width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#eef2ff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', fontWeight: 700, margin: '0 auto 1rem' }}>
            {(session.user.email || 'U')[0].toUpperCase()}
          </div>
          <h1 style={{ fontSize: '1.3rem', margin: '0 0 0.25rem' }}>You're signed in</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 0.5rem' }}>{session.user.email}</p>
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: '0.75rem', fontSize: '0.8rem', color: '#64748b', margin: '0 0 1.5rem' }}>
            User ID: <span style={{ color: '#0f172a', fontFamily: 'monospace' }}>{session.user.id.slice(0, 16)}…</span>
            <br />
            Provider: <span style={{ color: '#0f172a' }}>{session.user.app_metadata?.provider || 'email'}</span>
          </div>
          <button
            onClick={signOut}
            style={{ width: '100%', padding: '0.7rem', borderRadius: 8, background: '#0f172a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: '2.5rem', maxWidth: 400, width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#3ecf8e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem' }}>⚡</div>
          <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Supabase Auth</span>
        </div>
        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 1.5rem' }}>
          {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: 10, marginBottom: '1.5rem' }}>
          {(['login', 'signup'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); setMessage(''); }}
              style={{
                flex: 1, padding: '0.5rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                background: mode === m ? '#fff' : 'transparent', color: mode === m ? '#0f172a' : '#64748b', boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {m === 'login' ? 'Sign in' : 'Sign up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address" style={inputStyle}
          />
          {mode === 'signup' && (
            <input
              type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 characters)" style={inputStyle}
            />
          )}
          {mode === 'login' && (
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Password" style={inputStyle}
            />
          )}
          {error && <div style={{ background: '#fef2f2', color: '#ef4444', borderRadius: 8, padding: '0.6rem 0.8rem', fontSize: '0.8rem', marginBottom: '0.85rem' }}>{error}</div>}
          {message && <div style={{ background: '#ecfdf5', color: '#10b981', borderRadius: 8, padding: '0.6rem 0.8rem', fontSize: '0.8rem', marginBottom: '0.85rem' }}>{message}</div>}
          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', padding: '0.7rem', borderRadius: 8, background: '#3ecf8e', color: '#fff', border: 'none',
              cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem', opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Working...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          onClick={signInWithGoogle}
          style={{
            width: '100%', padding: '0.7rem', borderRadius: 8, background: '#fff', color: '#0f172a', border: '1px solid #e2e8f0',
            cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem',
          }}
        >
          Continue with Google
        </button>

        {mode === 'login' && (
          <button
            onClick={sendMagicLink} disabled={loading}
            style={{ width: '100%', padding: '0.7rem', borderRadius: 8, background: 'transparent', color: '#3ecf8e', border: '1px solid #3ecf8e', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
          >
            Send magic link
          </button>
        )}

        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', marginTop: '1.5rem', marginBottom: 0 }}>
          Powered by <strong>Supabase</strong>
        </p>
      </div>
    </div>
  );
}