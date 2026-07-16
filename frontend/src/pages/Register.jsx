import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, User, Mail, Key, Phone, ShieldCheck } from 'lucide-react';

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
  const [scrollY, setScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 800);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    const handleResize = () => {
      setIsMobile(window.innerWidth < 800);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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

  // Mobile collapsing scroll properties
  const fadeEnd = 160;
  const opacity = isMobile ? Math.max(0, 1 - scrollY / fadeEnd) : 1;
  const scale = isMobile ? 0.75 + opacity * 0.25 : 1; // scale from 0.75 to 1.0
  const height = isMobile ? Math.max(0, 350 - scrollY) : 350; // starts at 350px

  return (
    <div className="auth-container">
      <div className="auth-grid">
        {/* 3D Robot side */}
        <div 
          className="auth-3d-side"
          style={isMobile ? {
            opacity: opacity,
            height: `${height}px`,
            minHeight: 'auto',
            overflow: 'hidden',
            marginBottom: opacity > 0.05 ? '20px' : '0px',
            display: opacity > 0.05 ? 'flex' : 'none',
            transition: 'opacity 0.1s ease-out'
          } : {}}
        >
          <div style={{ position: 'absolute', width: '220px', height: '220px', background: 'var(--secondary)', filter: 'blur(100px)', opacity: 0.16, borderRadius: '50%', zIndex: 1, pointerEvents: 'none' }} />
          <div className="auth-3d-container" style={isMobile ? { height: '180px', transform: `scale(${scale})`, transformOrigin: 'center center' } : {}}>
            <spline-viewer 
              events-target="global"
              url="https://prod.spline.design/PyzDhpQ9E5f1E3MT/scene.splinecode" 
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          </div>
          <h3 className="glow-text" style={{ fontSize: '1.25rem', fontWeight: '800', marginTop: '16px', color: 'var(--secondary)' }}>
            Join Campus Recovery
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', maxWidth: '320px', marginTop: '6px', lineHeight: '1.4' }}>
            Enter your student details and let our 3D custodian secure your reports.
          </p>
          {isMobile && opacity > 0.8 && (
            <div className="scroll-indicator" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', marginTop: '8px', color: 'var(--secondary)', fontSize: '0.78rem', fontWeight: '700' }}>
              <span>Swipe down to register</span>
              <span>↓</span>
            </div>
          )}
        </div>

        {/* Register form side */}
        <div className="glass-card auth-card animate-fade-in" style={{ margin: 0, width: '100%' }}>
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

            <div className="form-group" style={{ marginBottom: '30px' }}>
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
