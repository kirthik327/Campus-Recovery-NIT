import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Key, User, ShieldAlert, ArrowLeft } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activePage, setActivePage] = useState(1); // 1 = Robot Splash, 2 = Login Credentials Form

  // Sync activePage state with URL query search parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('page') === 'form') {
      setActivePage(2);
    } else {
      setActivePage(1);
    }
  }, [location]);

  // Swipe gesture & wheel scrolling detections
  useEffect(() => {
    let touchStartY = 0;
    let touchStartX = 0;

    const handleTouchStart = (e) => {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
    };

    const handleTouchEnd = (e) => {
      const touchEndY = e.changedTouches[0].clientY;
      const touchEndX = e.changedTouches[0].clientX;
      const diffY = touchStartY - touchEndY;
      const diffX = touchStartX - touchEndX;

      // Swipe Up (diffY > 50) -> Go to credentials form
      // Swipe Down (diffY < -50) -> Go back to robot splash
      if (Math.abs(diffY) > 50 && Math.abs(diffY) > Math.abs(diffX)) {
        if (diffY > 0 && activePage === 1) {
          setActivePage(2);
        } else if (diffY < 0 && activePage === 2) {
          // Do not swipe back up if user is focusing an input field
          const activeEl = document.activeElement;
          if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
            return;
          }
          setActivePage(1);
        }
      }
    };

    const handleWheel = (e) => {
      if (e.deltaY > 15 && activePage === 1) {
        setActivePage(2);
      } else if (e.deltaY < -15 && activePage === 2) {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
          return;
        }
        setActivePage(1);
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [activePage]);

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
    <div className="auth-page-wrapper">
      {/* PAGE 1: Dynamic 3D Robot Splash Page */}
      <div className={`auth-splash-page ${activePage === 1 ? 'active' : 'inactive'}`}>
        <div style={{ position: 'absolute', width: '260px', height: '260px', background: 'var(--secondary)', filter: 'blur(110px)', opacity: 0.18, borderRadius: '50%', zIndex: 1, pointerEvents: 'none' }} />
        
        <div className="auth-splash-robot-container">
          <spline-viewer 
            events-target="global"
            url="https://prod.spline.design/PyzDhpQ9E5f1E3MT/scene.splinecode" 
          />
        </div>

        <h3 className="glow-text" style={{ fontSize: '1.45rem', fontWeight: '800', marginTop: '12px', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          AI Guardian Secures You
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', textAlign: 'center', maxWidth: '340px', marginTop: '6px', lineHeight: '1.4' }}>
          Meet our interactive helper bot. Verifying student records and protecting credentials.
        </p>

        <div className="scroll-indicator" onClick={() => setActivePage(2)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginTop: '24px', color: 'var(--secondary)', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer' }}>
          <span>Swipe Up or click to Login</span>
          <span style={{ fontSize: '1.35rem' }}>↓</span>
        </div>
      </div>

      {/* PAGE 2: Sliding Login Credentials Form Page */}
      <div className={`auth-form-page ${activePage === 2 ? 'active' : 'inactive'}`}>
        <button className="back-to-splash-btn" onClick={() => setActivePage(1)}>
          <ArrowLeft size={16} />
          Back to AI Guardian
        </button>

        <div className="glass-card auth-card" style={{ margin: 0, width: '100%', maxWidth: '440px' }}>
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
