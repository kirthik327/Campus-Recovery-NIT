import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, Sparkles, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import confetti from 'canvas-confetti';

const CATEGORIES = ['Electronics', 'Documents & ID Cards', 'Books & Stationery', 'Bags & Wallets', 'Keys', 'Clothing & Accessories', 'Water Bottles & Flasks', 'Other'];
const LOCATIONS = ['Library', 'Cafeteria', 'Seminar Hall', 'Block A', 'Block B', 'Main Playground', 'Admin Block', 'Science Lab', 'Other'];

export default function ReportItem() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();

  const [type, setType] = useState('lost'); // 'lost' or 'found'
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  
  // File upload state
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [detectedOCR, setDetectedOCR] = useState('');

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    // Limits
    if (files.length + selectedFiles.length > 5) {
      alert('You can upload up to 5 images.');
      return;
    }

    setFiles(prev => [...prev, ...selectedFiles]);

    // Create previews
    const filePreviews = selectedFiles.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...filePreviews]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    
    if (files.length + droppedFiles.length > 5) {
      alert('You can upload up to 5 images.');
      return;
    }

    setFiles(prev => [...prev, ...droppedFiles]);
    const filePreviews = droppedFiles.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...filePreviews]);
  };

  const clearFiles = () => {
    setFiles([]);
    setPreviews([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !category || !location || !date) {
      setStatusMsg({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }

    setLoading(true);
    setStatusMsg({ type: '', text: '' });
    setDetectedOCR('');

    try {
      const formData = new FormData();
      formData.append('type', type);
      formData.append('title', title);
      formData.append('category', category);
      formData.append('location', location);
      formData.append('date', date);
      formData.append('description', description);

      files.forEach(file => {
        formData.append('images', file);
      });

      // Explicitly set authorization token for file uploads in options
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/items', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        setStatusMsg({ type: 'success', text: `Item reported successfully! ${type === 'found' ? 'Please hand the physical item to the college office. It will appear on the feed after admin verification.' : 'Your lost item is now active in the system.'}` });
        
        if (data.ocrText) {
          setDetectedOCR(data.ocrText);
        }

        // Trigger confetti
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 }
        });

        // Reset fields
        setTitle('');
        setCategory('');
        setLocation('');
        setDescription('');
        clearFiles();

        // Redirect after a delay
        setTimeout(() => {
          navigate('/dashboard');
        }, 5000);
      } else {
        setStatusMsg({ type: 'error', text: data.message || 'Failed to submit report.' });
      }
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Connection error submitting report.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="report-container animate-fade-in">
      <div className="report-header">
        <h1>Report a Missing Item</h1>
        <p>Report what you lost or found so the system can matching ownerships</p>
      </div>

      <div className="glass-card">
        {/* Toggle Lost/Found */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          <button 
            type="button" 
            className={`btn ${type === 'lost' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setType('lost')}
          >
            I Lost Something
          </button>
          <button 
            type="button"
            className={`btn ${type === 'found' ? 'btn-secondary' : 'btn-outline'}`}
            onClick={() => setType('found')}
          >
            I Found Something
          </button>
        </div>

        {statusMsg.text && (
          <div 
            className={`badge ${statusMsg.type === 'success' ? 'badge-success' : 'badge-lost'}`}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', textTransform: 'none', marginBottom: '20px', gap: '8px', fontSize: '0.85rem' }}
          >
            {statusMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {detectedOCR && (
          <div style={{ background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.3)', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
            <span className="ocr-tag" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <Sparkles size={14} />
              AI OCR Text Extracted Successfully
            </span>
            <p style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--text-main)', marginTop: '8px' }}>{detectedOCR}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Item Title *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g., Black Wildcraft Backpack, iPhone 13, College ID Card"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value)} required>
                <option value="">Select Category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Campus Location *</label>
              <input 
                type="text" 
                className="form-input"
                placeholder="e.g. Library 2nd Floor, Block A Room 204"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Date {type === 'lost' ? 'Lost' : 'Found'} *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. 2026-07-14, Yesterday, Last Monday"
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Additional Details / Description</label>
            <textarea 
              rows="3" 
              className="form-input" 
              placeholder="Enter unique identification marks, brand, color, approximate time, or physical details."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Image Drag and Drop Zone */}
          <div className="form-group">
            <label className="form-label">Upload Images (Max 5)</label>
            <div 
              className="file-upload-zone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input').click()}
            >
              <UploadCloud size={36} className="upload-icon" />
              <h4>Drag & drop images here or click to browse</h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dark)', marginTop: '4px' }}>PNG, JPG, JPEG, WEBP files up to 5MB</p>
            </div>
            <input 
              type="file" 
              id="file-input" 
              multiple 
              accept="image/*"
              style={{ display: 'none' }} 
              onChange={handleFileChange}
            />

            {previews.length > 0 && (
              <div>
                <div className="file-upload-preview-container">
                  {previews.map((prev, idx) => (
                    <img key={idx} src={prev} alt="upload preview" className="file-upload-preview" />
                  ))}
                </div>
                <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: '10px' }} onClick={clearFiles}>
                  Clear Images
                </button>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            className={`btn ${type === 'lost' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ width: '100%', marginTop: '10px' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="online-indicator" style={{ display: 'inline-block', marginRight: '6px' }}></span>
                Processing AI OCR & saving...
              </>
            ) : (
              <>
                Submit Report
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
