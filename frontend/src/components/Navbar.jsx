import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bell, LogOut, ShieldAlert, Award, PlusCircle, LayoutDashboard, User, Search } from 'lucide-react';

export default function Navbar() {
  const { user, logout, authFetch, isAdmin, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Profile Edit States
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editYear, setEditYear] = useState('1st Year');
  const [editContact, setEditContact] = useState('');
  const [editRegisterNumber, setEditRegisterNumber] = useState('');

  useEffect(() => {
    if (user) {
      setEditUsername(user.username || '');
      setEditDepartment(user.department || '');
      setEditYear(user.year || '1st Year');
      setEditContact(user.contact || '');
      setEditRegisterNumber(user.registerNumber || '');
    }
  }, [user, showProfileModal]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    const hasExistingReg = user?.registerNumber && user.registerNumber.trim() !== '';
    if (!hasExistingReg && editRegisterNumber) {
      if (!editRegisterNumber.startsWith('7210')) {
        alert('Register Number must start with 7210.');
        return;
      }
    }

    try {
      const payload = {
        username: editUsername,
        department: editDepartment,
        year: editYear,
        contact: editContact
      };
      if (!hasExistingReg && editRegisterNumber) {
        payload.registerNumber = editRegisterNumber;
      }

      const res = await authFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        updateProfile(data.user);
        setIsEditing(false);
        alert('Profile updated successfully!');
      } else {
        alert(data.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error(err);
      alert('Connection error updating profile');
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await authFetch('/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.read).length);
      }
    } catch (err) {
      console.warn('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAsRead = async () => {
    try {
      const res = await authFetch('/notifications/read', { method: 'PUT' });
      if (res.ok) {
        setUnreadCount(0);
        setNotifications(notifications.map(n => ({ ...n, read: true })));
      }
    } catch (err) {
      console.warn('Error marking notifications as read:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <span className="brand-accent">CAMPUS</span>
          <span className="brand-glow">RECOVERY</span>
        </Link>

        {user ? (
          <div className="navbar-menu">
             <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
               <Search size={18} />
               <span className="nav-text">Lost & Found</span>
             </NavLink>
             
             <NavLink to="/report" className={({ isActive }) => `nav-link nav-link-highlight ${isActive ? 'nav-link-highlight-active' : ''}`}>
               <PlusCircle size={18} />
               <span className="nav-text">Report Item</span>
             </NavLink>
 
             <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
               <LayoutDashboard size={18} />
               <span className="nav-text">Dashboard</span>
             </NavLink>
 
             {isAdmin && (
               <NavLink to="/admin" className={({ isActive }) => `nav-link admin-glow ${isActive ? 'nav-link-admin-active' : ''}`}>
                 <ShieldAlert size={18} />
                 <span className="nav-text">Admin Panel</span>
               </NavLink>
             )}

            {/* Notification Center */}
            <div className="notification-center">
              <button 
                className={`notif-btn ${unreadCount > 0 ? 'pulse-bell' : ''}`} 
                onClick={() => {
                  setShowNotifDropdown(!showNotifDropdown);
                  if (!showNotifDropdown && unreadCount > 0) {
                    handleMarkAsRead();
                  }
                }}
                title="Notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </button>

              {showNotifDropdown && (
                <div className="notif-dropdown glass-card">
                  <div className="notif-header">
                    <h4>Notifications</h4>
                    {unreadCount > 0 && <span className="notif-header-unread">{unreadCount} new</span>}
                  </div>
                  <div className="notif-body">
                    {notifications.length === 0 ? (
                      <p className="notif-empty">No notifications yet.</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n._id || n.id} className={`notif-item ${!n.read ? 'notif-unread' : ''}`}>
                          <p className="notif-message">{n.message}</p>
                          <span className="notif-time">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile */}
            <div className="user-profile">
              <button 
                onClick={() => setShowProfileModal(true)}
                style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', textAlign: 'left' }}
                title="View Profile"
              >
                <div className="user-avatar">
                  <User size={16} />
                </div>
                <span className="username" style={{ maxWidth: '80px', display: 'inline-block' }}>{user.username}</span>
              </button>
              <button 
                className="logout-btn" 
                onClick={handleLogout} 
                title="Logout"
                style={{ color: 'var(--accent)', marginLeft: '8px', background: 'rgba(244, 63, 94, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="navbar-auth-buttons">
            <Link to="/login" className="btn btn-outline btn-sm" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>Login</Link>
            <Link to="/register" className="btn btn-secondary btn-sm" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>Register</Link>
          </div>
        )}
      </div>

    </nav>
      {/* Profile Details Modal Overlay */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)} style={{ zIndex: 1000 }}>
          <div className="glass-card modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={20} style={{ color: 'var(--secondary)' }} />
                Your College Profile
              </h3>
              <button className="close-btn" onClick={() => setShowProfileModal(false)}>✕</button>
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveProfile}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: '0px' }}>
                    <label className="form-label">Full Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={editUsername} 
                      onChange={(e) => setEditUsername(e.target.value)} 
                      required 
                    />
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: '0px' }}>
                    <label className="form-label">Department</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={editDepartment} 
                      onChange={(e) => setEditDepartment(e.target.value)} 
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '0px' }}>
                    <label className="form-label">Year of Study</label>
                    <select 
                      className="form-input" 
                      value={editYear} 
                      onChange={(e) => setEditYear(e.target.value)}
                    >
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                      <option value="Postgraduate">Postgraduate</option>
                      <option value="N/A">N/A (Staff / Admin)</option>
                    </select>
                  </div>

                  {user?.registerNumber && user.registerNumber.trim() !== '' ? (
                    <div className="form-group" style={{ marginBottom: '0px' }}>
                      <label className="form-label">Register Number</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ opacity: 0.6, cursor: 'not-allowed' }}
                        value={editRegisterNumber} 
                        disabled 
                      />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Registered codes cannot be changed.</span>
                    </div>
                  ) : (
                    <div className="form-group" style={{ marginBottom: '0px' }}>
                      <label className="form-label">Register Number *</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. 721021104001 (Starts with 7210)"
                        value={editRegisterNumber} 
                        onChange={(e) => setEditRegisterNumber(e.target.value)} 
                        required 
                      />
                      <span style={{ fontSize: '0.7rem', color: 'var(--secondary)' }}>Enter your 7210-prefixed register number (one-time setting).</span>
                    </div>
                  )}

                  <div className="form-group" style={{ marginBottom: '10px' }}>
                    <label className="form-label">Contact Number</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={editContact} 
                      onChange={(e) => setEditContact(e.target.value)} 
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setIsEditing(false)}>Cancel</button>
                    <button type="submit" className="btn btn-secondary btn-sm">Save Changes</button>
                  </div>
                </div>
              </form>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px' }}>
                    <div className="user-avatar" style={{ width: '40px', height: '40px' }}>
                      <User size={20} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: '700' }}>{user.username}</h4>
                      <span className="badge badge-found" style={{ fontSize: '0.62rem', marginTop: '2px' }}>
                        {user.role === 'admin' ? 'College Office Admin' : 'Student'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '0 4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Department</span>
                      <strong style={{ fontSize: '0.88rem' }}>{user.department || 'N/A'}</strong>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Year of Study</span>
                      <strong style={{ fontSize: '0.88rem' }}>{user.year || 'N/A'}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>College Email</span>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--secondary)' }}>{user.email}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Contact Number</span>
                      <strong style={{ fontSize: '0.88rem' }}>{user.contact || 'Not Provided'}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', marginTop: '24px' }}>
                  <button className="btn btn-outline btn-sm" onClick={() => setIsEditing(true)}>
                    Edit Profile
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={handleLogout} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <LogOut size={14} />
                    Log Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
