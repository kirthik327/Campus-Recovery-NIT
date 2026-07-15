import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, MapPin, Tag, Calendar, Eye, ShieldCheck, QrCode, Sparkles, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import useScrollAnimate from '../hooks/useScrollAnimate';

const CATEGORIES = ['Electronics', 'Documents & ID Cards', 'Books & Stationery', 'Bags & Wallets', 'Keys', 'Clothing & Accessories', 'Water Bottles & Flasks', 'Other'];
const LOCATIONS = ['Library', 'Cafeteria', 'Seminar Hall', 'Block A', 'Block B', 'Main Playground', 'Admin Block', 'Science Lab', 'Other'];

export default function Home() {
  const { authFetch, user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState('found'); // default to found items
  
  // Modals state
  const [selectedItem, setSelectedItem] = useState(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [proof, setProof] = useState('');
  const [contact, setContact] = useState(user?.contact || '');
  const [claimStatus, setClaimStatus] = useState({ type: '', message: '' });
  const [claimLoading, setClaimLoading] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  
  // AI Matches state
  const [aiMatches, setAiMatches] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);

  // Dynamic backends & animation observers
  const BACKEND_URL = `http://${window.location.hostname}:5000`;
  const searchRef = useScrollAnimate();
  const gridRef = useScrollAnimate();
  const heroRef = useScrollAnimate();
  const canvasRef = useRef(null);

  // Interactive Card 3D tilt effects
  const handleCardMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    const rotateX = ((yc - y) / yc) * 10;
    const rotateY = ((x - xc) / xc) * 10;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
    card.style.setProperty('--x', `${x}px`);
    card.style.setProperty('--y', `${y}px`);
  };

  const handleCardMouseLeave = (e) => {
    const card = e.currentTarget;
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
  };

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

  const fetchItems = async () => {
    setLoading(true);
    try {
      let query = `/items?type=${type}`;
      if (category) query += `&category=${encodeURIComponent(category)}`;
      if (location) query += `&location=${encodeURIComponent(location)}`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      
      const res = await authFetch(query);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [type, category, location]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchItems();
  };

  // Fetch AI matches for a lost item
  const handleFetchAIMatches = async (lostItemId) => {
    setAiLoading(true);
    setAiMatches([]);
    try {
      const res = await authFetch(`/ai/match/${lostItemId}`);
      if (res.ok) {
        const data = await res.json();
        setAiMatches(data);
      }
    } catch (err) {
      console.error('Error fetching AI matches:', err);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (selectedItem && selectedItem.type === 'lost') {
      handleFetchAIMatches(selectedItem._id || selectedItem.id);
    }
  }, [selectedItem]);

  // Submit Claim Handler
  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!proof || !contact) return;

    setClaimLoading(true);
    setClaimStatus({ type: '', message: '' });

    try {
      const itemId = selectedItem._id || selectedItem.id;
      const res = await authFetch(`/items/${itemId}/claim`, {
        method: 'POST',
        body: JSON.stringify({ proofDescription: proof, contact })
      });

      const data = await res.json();

      if (res.ok) {
        setClaimStatus({ type: 'success', message: 'Claim request submitted! The college office has been notified and will verify your details.' });
        setProof('');
        
        // Trigger confetti animation
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#8b5cf6', '#06b6d4', '#10b981']
        });
        
        // Refresh items list
        fetchItems();
        // Close modals shortly after
        setTimeout(() => {
          setShowClaimModal(false);
          setSelectedItem(null);
          setClaimStatus({ type: '', message: '' });
        }, 4000);
      } else {
        setClaimStatus({ type: 'error', message: data.message || 'Claim submission failed.' });
      }
    } catch (err) {
      setClaimStatus({ type: 'error', message: 'Connection error submitting claim.' });
    } finally {
      setClaimLoading(false);
    }
  };

  return (
    <div className="catalog-container animate-fade-in">
      <div ref={heroRef} className="hero-section reveal-scale-up">
        <div>
          <h1 style={{ fontSize: '3.5rem', fontWeight: '800', lineHeight: '1.1', marginBottom: '16px', background: 'linear-gradient(135deg, var(--text-main) 30%, var(--secondary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Campus <span className="glow-text" style={{ color: 'var(--secondary)' }}>Recovery</span> Portal
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '30px', lineHeight: '1.5', maxWidth: '520px' }}>
            Search, identify, and recover missing items on campus. A smart recognition feed powered by instant verifications and digital logs.
          </p>
          
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className={`btn ${type === 'found' ? 'btn-secondary' : 'btn-outline'}`}
              style={{ padding: '10px 24px', borderRadius: '10px' }}
              onClick={() => setType('found')}
            >
              Found Items
            </button>
            <button 
              className={`btn ${type === 'lost' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '10px 24px', borderRadius: '10px' }}
              onClick={() => setType('lost')}
            >
              Lost Items
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', width: '100%', minHeight: '350px' }}>
          <div style={{ position: 'absolute', width: '220px', height: '220px', background: 'var(--secondary)', filter: 'blur(100px)', opacity: 0.16, borderRadius: '50%', zIndex: 1, pointerEvents: 'none', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
          <div style={{ zIndex: 2, width: '100%', height: '350px', position: 'relative' }}>
            <spline-viewer 
              url="https://prod.spline.design/Jg9P1tP7wG-3G8oT/scene.splinecode" 
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <form ref={searchRef} onSubmit={handleSearchSubmit} className="glass-card search-filters-bar reveal-fade-up" style={{ padding: '16px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-dark)' }} />
          <input 
            type="text" 
            className="form-input form-input-sm"
            style={{ paddingLeft: '40px', height: '42px' }}
            placeholder="Search items by keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select 
          className="form-input" 
          style={{ height: '42px', padding: '0 12px' }}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <button type="submit" className="btn btn-primary btn-sm" style={{ height: '42px' }}>
          Apply Search
        </button>
      </form>

      {/* Grid Content */}
      {loading ? (
        <div className="item-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton skeleton-image"></div>
              <div className="skeleton-content">
                <div className="skeleton skeleton-title"></div>
                <div className="skeleton skeleton-text"></div>
                <div className="skeleton skeleton-text-short"></div>
                <div className="skeleton-footer">
                  <div className="skeleton" style={{ width: '80px', height: '14px' }}></div>
                  <div className="skeleton" style={{ width: '60px', height: '24px', borderRadius: '6px' }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--text-muted)' }}>No items found matching the selected criteria.</p>
        </div>
      ) : (
        <div ref={gridRef} className="item-grid reveal-fade-up">
          {items.map((item, idx) => (
            <div 
              key={item._id || item.id} 
              className="glass-card item-card item-card-3d-tilt"
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              <div className="item-card-image-container">
                <div className="item-badge-overlay">
                  <span className={`badge ${item.type === 'lost' ? 'badge-lost' : 'badge-found'}`}>
                    {item.type}
                  </span>
                </div>
                {item.images && item.images.length > 0 ? (
                  <img src={`${BACKEND_URL}${item.images[0]}`} alt={item.title} className="item-card-image" />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justify: 'center', color: 'var(--text-dark)', gap: '6px' }}>
                    <ImageIcon size={40} />
                    <span style={{ fontSize: '0.8rem' }}>No image available</span>
                  </div>
                )}
              </div>

              <div className="item-card-content">
                <div className="item-meta">
                  <span>{item.category}</span>
                  <span>{item.date}</span>
                </div>
                <h3 className="item-card-title">{item.title}</h3>
                <p className="item-card-desc">{item.description}</p>
                
                {item.ocrText && (
                  <div style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.03)', padding: '4px 8px', borderRadius: '4px', marginBottom: '12px', borderLeft: '2px solid var(--secondary)', color: 'var(--secondary)' }}>
                    <strong>Extracted Text:</strong> {item.ocrText.substring(0, 45)}...
                  </div>
                )}

                <div className="item-card-footer">
                  <span className="item-location">
                    <MapPin size={14} style={{ color: 'var(--secondary)' }} />
                    {item.location}
                  </span>
                  
                  <button 
                    onClick={() => setSelectedItem(item)}
                    className="btn btn-outline btn-sm"
                  >
                    <Eye size={14} />
                    Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="glass-card modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px', overflowY: 'auto', maxHeight: '90vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span className={`badge ${selectedItem.type === 'lost' ? 'badge-lost' : 'badge-found'}`} style={{ marginBottom: '8px' }}>
                  {selectedItem.type}
                </span>
                <h2>{selectedItem.title}</h2>
              </div>
              <button className="close-btn" onClick={() => setSelectedItem(null)}>✕</button>
            </div>

            {selectedItem.images && selectedItem.images.length > 0 ? (
              <div 
                onClick={() => setShowLightbox(true)}
                style={{ width: '100%', maxHeight: '380px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(15, 23, 42, 0.04)', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px', border: '1px solid rgba(15, 23, 42, 0.06)', cursor: 'zoom-in' }}
                title="Click to view full size"
              >
                <img 
                  src={`${BACKEND_URL}${selectedItem.images[0]}`} 
                  alt={selectedItem.title} 
                  style={{ maxWidth: '100%', maxHeight: '380px', objectFit: 'contain', display: 'block' }} 
                />
              </div>
            ) : (
              <div style={{ width: '100%', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', marginBottom: '16px' }}>
                <ImageIcon size={32} />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <MapPin size={16} style={{ color: 'var(--secondary)' }} />
                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Location</h4>
                  <p style={{ fontSize: '0.9rem' }}>{selectedItem.location}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Calendar size={16} style={{ color: 'var(--secondary)' }} />
                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Date</h4>
                  <p style={{ fontSize: '0.9rem' }}>{selectedItem.date}</p>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Description</h4>
              <p style={{ fontSize: '0.92rem' }}>{selectedItem.description || 'No description provided.'}</p>
            </div>

            {selectedItem.ocrText && (
              <div style={{ background: 'rgba(6, 182, 212, 0.05)', border: '1px solid rgba(6, 182, 212, 0.2)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                <span className="ocr-tag" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <Sparkles size={12} />
                  AI OCR Text Detected
                </span>
                <p style={{ fontSize: '0.82rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', color: 'var(--text-main)' }}>{selectedItem.ocrText}</p>
              </div>
            )}

            {/* Found Item QR Tag */}
            {selectedItem.type === 'found' && selectedItem.qrCode && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <img src={selectedItem.qrCode} alt="Item QR Tag" style={{ width: '80px', height: '80px', borderRadius: '4px' }} />
                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Item QR Identity</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Generated by office admin for secure ownership verification upon claim collection.</p>
                  <a href={selectedItem.qrCode} download={`QR_${selectedItem.title}.png`} className="btn btn-outline btn-sm" style={{ marginTop: '6px', padding: '4px 10px', fontSize: '0.7rem' }}>
                    <QrCode size={12} />
                    Download QR Tag
                  </a>
                </div>
              </div>
            )}

            {/* AI Similarity Matches for Lost Items */}
            {selectedItem.type === 'lost' && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--secondary)' }}>
                  <Sparkles size={16} />
                  AI Image Recognition Matches
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>AI search scanning reported found items for matching features...</p>
                
                {aiLoading ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Analyzing found items database...</p>
                ) : aiMatches.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-dark)' }}>No matches matching similarity threshold found.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {aiMatches.slice(0, 3).map((match, idx) => (
                      <div key={match.item._id || match.item.id} className="suggestion-card" onClick={() => setSelectedItem(match.item)}>
                        {match.item.images && match.item.images.length > 0 && (
                          <img src={`${BACKEND_URL}${match.item.images[0]}`} alt={match.item.title} className="suggestion-img" />
                        )}
                        <div className="suggestion-details" style={{ flex: 1 }}>
                          <h4>{match.item.title}</h4>
                          <p>Found: <strong>{match.item.location}</strong> on <strong>{match.item.date}</strong></p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                          <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                            {Math.round(match.score * 100)}% Match
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Claim button for Found Items */}
            {selectedItem.type === 'found' && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => setShowClaimModal(true)} 
                  className="btn btn-secondary" 
                  disabled={selectedItem.status !== 'approved'}
                >
                  <ShieldCheck size={18} />
                  {selectedItem.status === 'returned' ? 'Item Returned' : 'Claim Ownership'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Claim Submission Modal Overlay */}
      {showClaimModal && (
        <div className="modal-overlay" onClick={() => setShowClaimModal(false)}>
          <div className="glass-card modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>Submit Ownership Claim</h3>
              <button className="close-btn" onClick={() => setShowClaimModal(false)}>✕</button>
            </div>

            {claimStatus.message && (
              <div 
                className={`badge ${claimStatus.type === 'success' ? 'badge-success' : 'badge-lost'}`} 
                style={{ width: '100%', padding: '12px', borderRadius: '8px', textTransform: 'none', marginBottom: '16px', gap: '8px', fontSize: '0.82rem' }}
              >
                {claimStatus.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                <span>{claimStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleClaimSubmit}>
              <div className="form-group">
                <label className="form-label">Proof of Ownership</label>
                <textarea 
                  rows="4" 
                  className="form-input" 
                  placeholder="Describe unique markings, text, contents, or details that prove this item is yours (e.g. 'The laptop case has a cracked corner', 'Water bottle has my name Priya written on the bottom')."
                  value={proof}
                  onChange={(e) => setProof(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Contact Number (for confirmation)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  required 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowClaimModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-secondary" disabled={claimLoading}>
                  {claimLoading ? 'Submitting...' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Lightbox Zoom Modal */}
      {showLightbox && selectedItem && selectedItem.images && selectedItem.images.length > 0 && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowLightbox(false)} 
          style={{ zIndex: 1100, backgroundColor: 'rgba(0, 0, 0, 0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'zoom-out' }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
            <button 
              className="close-btn" 
              onClick={() => setShowLightbox(false)} 
              style={{ position: 'absolute', top: '-40px', right: '0', color: 'white', border: 'none', background: 'none', fontSize: '1.8rem', cursor: 'pointer' }}
            >
              ✕
            </button>
            <img 
              src={`${BACKEND_URL}${selectedItem.images[0]}`} 
              alt={selectedItem.title} 
              style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 12px 48px rgba(0, 0, 0, 0.8)' }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
