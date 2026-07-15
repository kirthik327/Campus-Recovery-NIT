import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Key, User, ShieldAlert } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Hide Spline watermark logo from shadow DOM
  useEffect(() => {
    const hideSplineLogo = () => {
      const viewers = document.querySelectorAll('spline-viewer');
      viewers.forEach(viewer => {
        if (viewer && viewer.shadowRoot) {
          const logo = viewer.shadowRoot.querySelector('#logo');
          if (logo) {
            logo.style.display = 'none';
          }
        }
      });
    };

    const interval = setInterval(hideSplineLogo, 100);
    window.addEventListener('load', hideSplineLogo);

    return () => {
      clearInterval(interval);
      window.removeEventListener('load', hideSplineLogo);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) return;
    
    setError('');
    setLoading(true);

    try {
      const user = await login(identifier, password);
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-grid">
        {/* 3D Robot side */}
        <div className="auth-3d-side">
          <div style={{ position: 'absolute', width: '220px', height: '220px', background: 'var(--secondary)', filter: 'blur(100px)', opacity: 0.16, borderRadius: '50%', zIndex: 1, pointerEvents: 'none' }} />
          <div className="auth-3d-container">
            <spline-viewer 
              url="https://prod.spline.design/PyzDhpQ9E5f1E3MT/scene.splinecode" 
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          </div>
          <h3 className="glow-text" style={{ fontSize: '1.25rem', fontWeight: '800', marginTop: '16px', color: 'var(--secondary)' }}>
            AI Guardian Secures You
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', maxWidth: '320px', marginTop: '6px', lineHeight: '1.4' }}>
            Meet our interactive helper bot. Verifying student records and protecting credentials.
          </p>
        </div>

        {/* Login form side */}
        <div className="glass-card auth-card animate-fade-in" style={{ margin: 0, width: '100%' }}>
          <div className="auth-header">
            <h2>Welcome Back</h2>
            <p>Login to report items and track claims</p>
          </div>

          {error && (
            <div className="badge badge-lost" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', marginBottom: '20px', textTransform: 'none', justifyContent: 'flex-start', gap: '8px' }}>
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Register Number or Email</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-dark)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '48px' }}
                  placeholder="e.g. 721021104001 or admin@college.edu"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '30px' }}>
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Key size={16} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-dark)' }} />
                <input
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: '48px' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-secondary" style={{ width: '100%' }} disabled={loading}>
              {loading ? (
                <>
                  <span className="online-indicator" style={{ display: 'inline-block', marginRight: '6px' }}></span>
                  Logging in...
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            Don't have an account? <Link to="/register">Register here</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
