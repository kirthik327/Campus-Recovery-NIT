import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, X, Send, Bot, RefreshCw, AlertCircle } from 'lucide-react';

export default function Chatbot() {
  const { authFetch, user } = useAuth();
  
  if (!user) return null;

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Hi! I am the Campus AI Recovery Assistant. Tell me what you lost (e.g., "I lost my red Casio calculator near the library") and I will search our found items database for you!',
      timestamp: new Date()
    }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await authFetch('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: userMessage.text })
      });

      if (!res.ok) {
        throw new Error('Failed to get chatbot response');
      }

      const data = await res.json();
      
      const botMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: data.reply,
        items: data.suggestedItems || [],
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      console.error('Chatbot error:', err);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: "I'm having trouble connecting to the AI brain right now. Please check back shortly or search the catalog manually!",
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chatbot-overlay">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button className="chatbot-toggle glow-effect" onClick={() => setIsOpen(true)}>
          <MessageSquare size={24} />
          <span className="chatbot-badge">AI Helper</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-window glass-card">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-title">
              <Bot size={20} className="bot-icon" />
              <div>
                <h3>Recovery AI</h3>
                <span className="online-indicator">Active</span>
              </div>
            </div>
            <button className="close-btn" onClick={() => setIsOpen(false)}>
              <X size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="chatbot-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-bubble-container ${msg.sender === 'user' ? 'user-container' : 'bot-container'}`}>
                <div className={`chat-bubble ${msg.sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'} ${msg.isError ? 'chat-bubble-error' : ''}`}>
                  <p>{msg.text}</p>
                  
                  {/* Suggested Match Cards */}
                  {msg.items && msg.items.length > 0 && (
                    <div className="chatbot-suggestions">
                      <p className="suggestion-header">Potential Matches Found:</p>
                      {msg.items.map(item => (
                        <div key={item._id || item.id} className="suggestion-card">
                          {item.images && item.images.length > 0 && (
                            <img src={`http://localhost:5000${item.images[0]}`} alt={item.title} className="suggestion-img" />
                          )}
                          <div className="suggestion-details">
                            <h4>{item.title}</h4>
                            <p>Found at: <strong>{item.location}</strong></p>
                            <p>Date: <strong>{item.date}</strong></p>
                            <span className="badge badge-found" style={{ fontSize: '0.65rem', marginTop: '4px' }}>Found</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <span className="chat-time">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}

            {loading && (
              <div className="chat-bubble-container bot-container">
                <div className="chat-bubble chat-bubble-bot typing-bubble">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form className="chatbot-input-form" onSubmit={handleSend}>
            <input
              type="text"
              className="form-input chat-input"
              placeholder="Ask the chatbot about a lost item..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              required
            />
            <button type="submit" className="send-btn btn-primary" disabled={loading}>
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
