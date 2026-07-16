import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, User, Mail, Key, Phone, ShieldCheck, ArrowLeft } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registerNumber, setRegisterNumber] = useState('');
  const [contact, setContact] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('1st Year');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activePage, setActivePage] = useState(1); // 1 = Robot Splash, 2 = Register Form

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

      // Swipe Up (diffY > 50) -> Go to registration form
      // Swipe Down (diffY < -50) -> Go back to robot splash
      if (Math.abs(diffY) > 50 && Math.abs(diffY) > Math.abs(diffX)) {
        if (diffY > 0 && activePage === 1) {
          setActivePage(2);
        } else if (diffY < 0 && activePage === 2) {
          // Do not swipe back up if user is focusing an input or select field
          const activeEl = document.activeElement;
          if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
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
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
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
    if (!username || !email || !password || !registerNumber) return;

    if (!registerNumber.startsWith('7210')) {
      setError('Register Number must start with 7210.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await register(username, email, password, contact, department, year, registerNumber);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Try again.');
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
          Join Campus Recovery
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', textAlign: 'center', maxWidth: '340px', marginTop: '6px', lineHeight: '1.4' }}>
          Enter your student details and let our 3D custodian secure your reports.
        </p>

        <div className="scroll-indicator" onClick={() => setActivePage(2)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginTop: '24px', color: 'var(--secondary)', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer' }}>
          <span>Swipe Up or click to Register</span>
          <span style={{ fontSize: '1.35rem' }}>↓</span>
        </div>
      </div>

      {/* PAGE 2: Sliding Registration Form Page */}
      <div className={`auth-form-page ${activePage === 2 ? 'active' : 'inactive'}`} style={{ overflowY: 'auto' }}>
        <button className="back-to-splash-btn" onClick={() => setActivePage(1)}>
          <ArrowLeft size={16} />
          Back to AI Guardian
        </button>

        <div className="glass-card auth-card" style={{ margin: '80px 0 40px 0', width: '100%', maxWidth: '440px' }}>
          <div className="auth-header">
            <h2>Create Account</h2>
            <p>Register as a student to access the recovery portal</p>
          </div>

          {error && (
            <div className="badge badge-lost" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', marginBottom: '20px', textTransform: 'none', justifyContent: 'flex-start', gap: '8px' }}>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-dark)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '48px' }}
                  placeholder="Aarav Sharma"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">College Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-dark)' }} />
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '48px' }}
                  placeholder="student@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Register Number *</label>
              <div style={{ position: 'relative' }}>
                <ShieldCheck size={16} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-dark)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '48px' }}
                  placeholder="e.g. 721021104001 (Must start with 7210)"
                  value={registerNumber}
                  onChange={(e) => setRegisterNumber(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Department *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Computer Science, Mechanical, Physics"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Year of Study *</label>
              <select 
                className="form-input" 
                value={year} 
                onChange={(e) => setYear(e.target.value)}
                required
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
                <option value="Postgraduate">Postgraduate</option>
                <option value="N/A">N/A (Staff / Admin)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Key size={16} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-dark)' }} />
                <input
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: '48px' }}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Mobile Number (for Claim Updates)</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-dark)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '48px' }}
                  placeholder="+91 98765 43210"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? (
                'Creating account...'
              ) : (
                <>
                  <UserPlus size={18} />
                  Register Account
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            Already have an account? <Link to="/login">Login here</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
