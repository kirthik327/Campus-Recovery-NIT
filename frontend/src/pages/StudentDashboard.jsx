import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileQuestion, ShieldCheck, Clock, Award, CheckCircle2, ChevronRight, RefreshCw, Eye, User, Trash2 } from 'lucide-react';

export default function StudentDashboard() {
  const { authFetch, user, updateProfile } = useAuth();
  const [myItems, setMyItems] = useState([]);
  const [myClaims, setMyClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  // Profile Editor states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editYear, setEditYear] = useState('1st Year');
  const [editContact, setEditContact] = useState('');
  const [editRegisterNumber, setEditRegisterNumber] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [editError, setEditError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setEditUsername(user.username || '');
      setEditDepartment(user.department || '');
      setEditYear(user.year || '1st Year');
      setEditContact(user.contact || '');
      setEditRegisterNumber(user.registerNumber || '');
    }
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    setEditSuccess('');
    setEditError('');

    // If they are registering a register number now, validate it
    const hasExistingReg = user?.registerNumber && user.registerNumber.trim() !== '';
    if (!hasExistingReg && editRegisterNumber) {
      if (!editRegisterNumber.startsWith('7210')) {
        setEditError('Register Number must start with 7210.');
        setSaveLoading(false);
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

      // Only pass registerNumber if they are setting it for the first time
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
        setIsEditingProfile(false);
        setEditSuccess('Profile updated successfully!');
      } else {
        setEditError(data.message || 'Failed to update profile.');
      }
    } catch (err) {
      setEditError('Connection error updating profile.');
    } finally {
      setSaveLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [itemsRes, claimsRes] = await Promise.all([
        authFetch('/items/my-items'),
        authFetch('/claims/my-claims')
      ]);

      if (itemsRes.ok && claimsRes.ok) {
        const itemsData = await itemsRes.json();
        const claimsData = await claimsRes.json();
        setMyItems(itemsData);
        setMyClaims(claimsData);
      }
    } catch (err) {
      console.error('Error fetching student dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this reported item? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await authFetch(`/items/${itemId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchDashboardData();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to delete item.');
      }
    } catch (err) {
      console.error('Error deleting item:', err);
      alert('Connection error deleting item.');
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return <span className="badge badge-warning">Pending Office Review</span>;
      case 'approved': return <span className="badge badge-success">Approved / Active</span>;
      case 'claimed': return <span className="badge badge-success">Claim Pending Approval</span>;
      case 'returned': return <span className="badge badge-found" style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>Returned to Owner</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  const getClaimStatusBadge = (status) => {
    switch (status) {
      case 'pending': return <span className="badge badge-warning">Pending Verification</span>;
      case 'approved': return <span className="badge badge-success">Claim Approved</span>;
      case 'rejected': return <span className="badge badge-lost">Claim Rejected</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="app-container animate-fade-in" style={{ margin: '20px auto' }}>
      <div className="dashboard-header">
        <div>
          <h1 style={{ fontSize: '2rem' }}>Student Recovery Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Hello, {user?.username}. Track reported items and manage your claim ownership requests.</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={fetchDashboardData}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {loading ? (
        <p>Loading your dashboard details...</p>
      ) : (
        <div className="section-grid">
          {/* Left Column: Reported Items & Claims */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {/* My Reported Items */}
            <div className="glass-card">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileQuestion size={20} style={{ color: 'var(--primary)' }} />
                Your Reported Items ({myItems.length})
              </h2>

              {myItems.length === 0 ? (
                <p style={{ color: 'var(--text-dark)', fontSize: '0.9rem' }}>You have not reported any lost or found items yet.</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Item Details</th>
                        <th>Type</th>
                        <th>Location & Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myItems.map(item => (
                        <tr key={item._id || item.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{item.title}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.category}</div>
                          </td>
                          <td>
                            <span className={`badge ${item.type === 'lost' ? 'badge-lost' : 'badge-found'}`}>
                              {item.type}
                            </span>
                          </td>
                          <td>
                            <div>{item.location}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.date}</div>
                          </td>
                          <td>{getStatusBadge(item.status)}</td>
                          <td>
                            <button 
                              onClick={() => handleDeleteItem(item._id || item.id)} 
                              className="btn btn-outline btn-sm" 
                              style={{ padding: '6px', color: 'var(--lost)', borderColor: 'rgba(239, 68, 68, 0.2)', minWidth: 'auto' }}
                              title="Delete reported item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* My Claims */}
            <div className="glass-card">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} style={{ color: 'var(--secondary)' }} />
                Your Ownership Claims ({myClaims.length})
              </h2>

              {myClaims.length === 0 ? (
                <p style={{ color: 'var(--text-dark)', fontSize: '0.9rem' }}>You have no pending claims at this time.</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Item Title</th>
                        <th>Submission Date</th>
                        <th>Proof Summary</th>
                        <th>Claim Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myClaims.map(claim => (
                        <tr key={claim._id || claim.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{claim.item?.title || 'Unknown Item'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{claim.item?.category}</div>
                          </td>
                          <td>{new Date(claim.createdAt).toLocaleDateString()}</td>
                          <td style={{ maxWidth: '200px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {claim.proofDescription}
                          </td>
                          <td>{getClaimStatusBadge(claim.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Statistics & Rules */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* College Profile Settings Card */}
            <div className="glass-card">
              <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={18} style={{ color: 'var(--secondary)' }} />
                Your Profile Details
              </h3>

              {editSuccess && (
                <div className="badge badge-success" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', marginBottom: '16px', textTransform: 'none' }}>
                  {editSuccess}
                </div>
              )}
              {editError && (
                <div className="badge badge-lost" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', marginBottom: '16px', textTransform: 'none' }}>
                  {editError}
                </div>
              )}

              {isEditingProfile ? (
                <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Full Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ padding: '8px 12px', fontSize: '0.88rem' }}
                      value={editUsername} 
                      onChange={(e) => setEditUsername(e.target.value)} 
                      required 
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Department</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ padding: '8px 12px', fontSize: '0.88rem' }}
                      value={editDepartment} 
                      onChange={(e) => setEditDepartment(e.target.value)} 
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Year of Study</label>
                    <select 
                      className="form-input" 
                      style={{ padding: '8px 12px', fontSize: '0.88rem', height: '38px' }}
                      value={editYear} 
                      onChange={(e) => setEditYear(e.target.value)}
                    >
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                      <option value="Postgraduate">Postgraduate</option>
                      <option value="N/A">N/A</option>
                    </select>
                  </div>

                  {user?.registerNumber && user.registerNumber.trim() !== '' ? (
                    <div className="form-group" style={{ marginBottom: '0' }}>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>Register Number</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ padding: '8px 12px', fontSize: '0.88rem', opacity: 0.6, cursor: 'not-allowed' }}
                        value={editRegisterNumber} 
                        disabled 
                      />
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Registered codes cannot be changed.</span>
                    </div>
                  ) : (
                    <div className="form-group" style={{ marginBottom: '0' }}>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>Register Number *</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ padding: '8px 12px', fontSize: '0.88rem' }}
                        placeholder="e.g. 721021104001 (Starts with 7210)"
                        value={editRegisterNumber} 
                        onChange={(e) => setEditRegisterNumber(e.target.value)} 
                        required 
                      />
                      <span style={{ fontSize: '0.72rem', color: 'var(--secondary)' }}>Enter your 7210-prefixed register number (one-time setting).</span>
                    </div>
                  )}

                  <div className="form-group" style={{ marginBottom: '8px' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Contact Number</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ padding: '8px 12px', fontSize: '0.88rem' }}
                      value={editContact} 
                      onChange={(e) => setEditContact(e.target.value)} 
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-outline btn-sm" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setIsEditingProfile(false)}>Cancel</button>
                    <button type="submit" className="btn btn-secondary btn-sm" style={{ padding: '6px 12px', fontSize: '0.8rem' }} disabled={saveLoading}>
                      {saveLoading ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', flexShrink: 0 }}>Name</span>
                    <strong style={{ fontSize: '0.85rem', textAlign: 'right', wordBreak: 'break-word', minWidth: 0, flexShrink: 1 }}>{user?.username}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', flexShrink: 0 }}>Register Number</span>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--secondary)', textAlign: 'right', wordBreak: 'break-word', minWidth: 0, flexShrink: 1 }}>{user?.registerNumber || 'N/A'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', flexShrink: 0 }}>Department</span>
                    <strong style={{ fontSize: '0.85rem', textAlign: 'right', wordBreak: 'break-word', minWidth: 0, flexShrink: 1 }}>{user?.department || 'N/A'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', flexShrink: 0 }}>Year of Study</span>
                    <strong style={{ fontSize: '0.85rem', textAlign: 'right', wordBreak: 'break-word', minWidth: 0, flexShrink: 1 }}>{user?.year || 'N/A'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', flexShrink: 0 }}>College Email</span>
                    <strong style={{ fontSize: '0.85rem', textAlign: 'right', wordBreak: 'break-word', minWidth: 0, flexShrink: 1 }}>{user?.email}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', flexShrink: 0 }}>Mobile Number</span>
                    <strong style={{ fontSize: '0.85rem', textAlign: 'right', wordBreak: 'break-word', minWidth: 0, flexShrink: 1 }}>{user?.contact || 'N/A'}</strong>
                  </div>

                  <button className="btn btn-outline btn-sm" style={{ marginTop: '8px', width: '100%' }} onClick={() => setIsEditingProfile(true)}>
                    Edit Profile Details
                  </button>
                </div>
              )}
            </div>

            <div className="glass-card">
              <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>Your Impact</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Items Reported</span>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--secondary)' }}>{myItems.length}</strong>
                </div>
                <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Recovered / Claimed</span>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--success)' }}>
                    {myClaims.filter(c => c.status === 'approved').length}
                  </strong>
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ borderLeft: '3px solid var(--secondary)' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '12px', color: 'var(--secondary)' }}>Campus Verification Guide</h3>
              <ul style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>Items you hand in are verified by office administrators before appearing publicly.</li>
                <li>QR Identity Tags are attached to all verified found items.</li>
                <li>When submitting a claim, provide specific details that are not visible in the photo.</li>
                <li>Once a claim is approved, bring your College ID card to the office for physical handover.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
