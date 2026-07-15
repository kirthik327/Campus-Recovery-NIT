import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  FileQuestion, ShieldCheck, Check, X, ShieldAlert, Award, 
  TrendingUp, Activity, Inbox, RotateCcw, AlertTriangle, Users, BarChart3, MapPin, ClipboardList, Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function AdminDashboard() {
  const { authFetch } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [pendingItems, setPendingItems] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue', 'claims', 'analytics'
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, itemsRes, claimsRes] = await Promise.all([
        authFetch('/reports/analytics'),
        authFetch('/items?status=pending'),
        authFetch('/claims')
      ]);

      if (analyticsRes.ok && itemsRes.ok && claimsRes.ok) {
        setAnalytics(await analyticsRes.json());
        setPendingItems(await itemsRes.json());
        setClaims(await claimsRes.json());
      }
    } catch (err) {
      console.error('Error fetching admin details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Item approval
  const handleApproveItem = async (itemId, action) => {
    setActionLoading(true);
    try {
      const res = await authFetch(`/items/${itemId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: action }) // 'approved' or 'rejected'
      });
      if (res.ok) {
        // Trigger confetti on approval
        if (action === 'approved') {
          confetti({ particleCount: 50, spread: 60, colors: ['#06b6d4', '#8b5cf6'] });
        }
        fetchAdminData();
      } else {
        const errData = await res.json();
        alert(errData.message || 'Operation failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Claim approval
  const handleProcessClaim = async (claimId, action) => {
    setActionLoading(true);
    try {
      const res = await authFetch(`/claims/${claimId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: action }) // 'approved' or 'rejected'
      });
      if (res.ok) {
        if (action === 'approved') {
          confetti({ particleCount: 100, spread: 80, colors: ['#10b981', '#06b6d4'] });
        }
        fetchAdminData();
      } else {
        const errData = await res.json();
        alert(errData.message || 'Operation failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Direct delete
  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this reported item?')) return;
    setActionLoading(true);
    try {
      const res = await authFetch(`/items/${itemId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="app-container animate-fade-in" style={{ margin: '20px auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Office Admin Panel</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage item submissions, verify claims, and view campus metrics.</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={fetchAdminData}>
          <RotateCcw size={14} />
          Refresh Panel
        </button>
      </div>

      {/* Analytics Summary Stats Cards */}
      {analytics && (
        <div className="dashboard-grid">
          <div className="glass-card stat-card">
            <div className="stat-icon stat-icon-lost">
              <Inbox size={22} />
            </div>
            <div className="stat-info">
              <h3>Total Reports</h3>
              <div className="stat-value">{analytics.summary.totalLost + analytics.summary.totalFound}</div>
            </div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-icon stat-icon-pending">
              <FileQuestion size={22} />
            </div>
            <div className="stat-info">
              <h3>Pending Approvals</h3>
              <div className="stat-value">{analytics.summary.pendingApprovals}</div>
            </div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-icon stat-icon-found">
              <ShieldAlert size={22} />
            </div>
            <div className="stat-info">
              <h3>Active Claims</h3>
              <div className="stat-value">{analytics.summary.activeClaims}</div>
            </div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-icon stat-icon-success">
              <Award size={22} />
            </div>
            <div className="stat-info">
              <h3>Returned Items</h3>
              <div className="stat-value">{analytics.summary.itemsReturned}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '24px' }}>
        <button 
          className={`btn btn-sm ${activeTab === 'queue' ? 'btn-secondary' : 'btn-outline'}`}
          onClick={() => setActiveTab('queue')}
        >
          <Inbox size={14} />
          Review Queue ({pendingItems.length})
        </button>
        <button 
          className={`btn btn-sm ${activeTab === 'claims' ? 'btn-secondary' : 'btn-outline'}`}
          onClick={() => setActiveTab('claims')}
        >
          <ShieldCheck size={14} />
          Manage Claims ({claims.filter(c => c.status === 'pending').length})
        </button>
        <button 
          className={`btn btn-sm ${activeTab === 'analytics' ? 'btn-secondary' : 'btn-outline'}`}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart3 size={14} />
          Analytics Dashboard
        </button>
      </div>

      {loading ? (
        <p>Loading administration data...</p>
      ) : (
        <div>
          {/* QUEUE TAB */}
          {activeTab === 'queue' && (
            <div className="glass-card">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Student Submission Approvals Queue</h2>
              {pendingItems.length === 0 ? (
                <p style={{ color: 'var(--text-dark)' }}>No items currently in the review queue.</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Photo</th>
                        <th>Item Details</th>
                        <th>Type</th>
                        <th>Reporter</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingItems.map(item => {
                        const itemId = item._id || item.id;
                        return (
                          <tr key={itemId}>
                            <td>
                              {item.images && item.images.length > 0 ? (
                                <img src={`http://localhost:5000${item.images[0]}`} alt={item.title} style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '6px' }} />
                              ) : (
                                <span style={{ color: 'var(--text-dark)' }}>No Photo</span>
                              )}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{item.title}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.category} | Found at: {item.location} on {item.date}</div>
                            </td>
                            <td>
                              <span className={`badge ${item.type === 'lost' ? 'badge-lost' : 'badge-found'}`}>{item.type}</span>
                            </td>
                            <td>{item.reportedBy}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                                  onClick={() => handleApproveItem(itemId, 'approved')}
                                  disabled={actionLoading}
                                >
                                  <Check size={12} />
                                  Approve
                                </button>
                                <button 
                                  className="btn btn-danger btn-sm"
                                  style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                                  onClick={() => handleApproveItem(itemId, 'rejected')}
                                  disabled={actionLoading}
                                >
                                  <X size={12} />
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* CLAIMS TAB */}
          {activeTab === 'claims' && (
            <div className="glass-card">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Student Claims Manager</h2>
              {claims.length === 0 ? (
                <p style={{ color: 'var(--text-dark)' }}>No claim requests submitted yet.</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Claimed Item</th>
                        <th>Claimant</th>
                        <th>Contact</th>
                        <th>Proof of Ownership Description</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {claims.map(claim => {
                        const claimId = claim._id || claim.id;
                        return (
                          <tr key={claimId}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{claim.item?.title || 'Unknown Item'}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Category: {claim.item?.category}</div>
                            </td>
                            <td>{claim.claimantName}</td>
                            <td>{claim.claimantContact}</td>
                            <td style={{ maxWidth: '300px', wordWrap: 'break-word', fontSize: '0.82rem' }}>
                              {claim.proofDescription}
                            </td>
                            <td>
                              {claim.status === 'pending' ? (
                                <span className="badge badge-warning">Pending Review</span>
                              ) : claim.status === 'approved' ? (
                                <span className="badge badge-success">Approved</span>
                              ) : (
                                <span className="badge badge-lost">Rejected</span>
                              )}
                            </td>
                            <td>
                              {claim.status === 'pending' && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button 
                                    className="btn btn-secondary btn-sm"
                                    style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                                    onClick={() => handleProcessClaim(claimId, 'approved')}
                                    disabled={actionLoading}
                                  >
                                    <Check size={12} />
                                    Release Item
                                  </button>
                                  <button 
                                    className="btn btn-outline btn-sm"
                                    style={{ padding: '6px 12px', fontSize: '0.75rem', color: 'var(--accent)', borderColor: 'var(--accent)' }}
                                    onClick={() => handleProcessClaim(claimId, 'rejected')}
                                    disabled={actionLoading}
                                  >
                                    <X size={12} />
                                    Reject
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ANALYTICS TAB */}
          {activeTab === 'analytics' && analytics && (
            <div className="section-grid">
              {/* Category Breakdown & Locations */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="glass-card">
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <BarChart3 size={18} style={{ color: 'var(--secondary)' }} />
                    Category Breakdown
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {analytics.categories.map((c, idx) => (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justify: 'space-between', fontSize: '0.85rem' }}>
                          <span>{c.category}</span>
                          <strong>{c.count} items</strong>
                        </div>
                        {/* Custom progress bar */}
                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              width: `${(c.count / (analytics.summary.totalLost + analytics.summary.totalFound || 1)) * 100}%`, 
                              height: '100%', 
                              background: 'linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)', 
                              borderRadius: '3px' 
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card">
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <MapPin size={18} style={{ color: 'var(--secondary)' }} />
                    Location Hotspots
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {analytics.locations.slice(0, 5).map((l, idx) => (
                      <div key={idx} style={{ display: 'flex', justify: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem' }}>
                        <span>{l.location}</span>
                        <strong>{l.count} items reported</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent System Timeline */}
              <div className="glass-card">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <Activity size={18} style={{ color: 'var(--primary)' }} />
                  Recent Activity Timeline
                </h3>
                <div className="recent-timeline">
                  {analytics.recentActivity.length === 0 ? (
                    <p style={{ color: 'var(--text-dark)' }}>No activities logged yet.</p>
                  ) : (
                    analytics.recentActivity.map((act, idx) => (
                      <div key={idx} className="timeline-item">
                        <div 
                          className="timeline-dot" 
                          style={{ 
                            background: act.badge === 'lost' ? 'var(--accent)' : act.badge === 'found' ? 'var(--secondary)' : 'var(--success)',
                            boxShadow: `0 0 6px ${act.badge === 'lost' ? 'var(--accent-glow)' : act.badge === 'found' ? 'var(--secondary-glow)' : 'rgba(16, 185, 129, 0.4)'}`
                          }}
                        ></div>
                        <div className="timeline-content">
                          <h4>{act.title}</h4>
                          <p>Reported by: <strong>{act.user}</strong> | {new Date(act.time).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
