import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Lock } from 'lucide-react';

const ChatOverlay = ({ isOpen, onClose, contact }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && contact) {
      // Load initial mock history
      setMessages([
        { id: 1, sender: 'them', text: `Olá! Vi que estamos no mesmo evento.`, time: '10:42' },
        { id: 2, sender: 'me', text: `E aí ${contact.name.split(' ')[0]}! Sim, o evento está incrível.`, time: '10:45' }
      ]);
    }
  }, [isOpen, contact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const newMsg = { id: Date.now(), sender: 'me', text: message, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, newMsg]);
    setMessage('');

    // Simulate reply
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        sender: 'them', 
        text: `Entendi! Bom saber. O Connex tá me ajudando muito a mapear essas interações.`, 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      }]);
    }, 1500);
  };

  if (!isOpen || !contact) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '350px',
      height: '450px',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      border: `1px solid var(--border-color)`
    }} className="glass-panel">
      
      {/* Header */}
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            {contact.name.charAt(0)}
          </div>
          <div>
            <h4 style={{ fontSize: '0.95rem', margin: 0 }}>{contact.name}</h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{contact.role || 'Conexão'}</span>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ alignSelf: msg.sender === 'me' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
            <div style={{
              background: msg.sender === 'me' ? 'var(--primary-color)' : 'rgba(255,255,255,0.08)',
              padding: '0.6rem 0.8rem',
              borderRadius: msg.sender === 'me' ? '15px 15px 0 15px' : '15px 15px 15px 0',
              fontSize: '0.9rem',
              color: 'white'
            }}>
              {msg.text}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.25rem', textAlign: msg.sender === 'me' ? 'right' : 'left' }}>
              {msg.time}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.2)' }}>
        <input 
          type="text" 
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Escreva uma mensagem..."
          style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '0.5rem 1rem', color: 'white', outline: 'none' }}
        />
        <button type="submit" disabled={!message.trim()} style={{ background: 'var(--primary-color)', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: message.trim() ? 'pointer' : 'not-allowed', opacity: message.trim() ? 1 : 0.5, color: 'white' }}>
          <Send size={16} style={{ marginLeft: '-2px' }} />
        </button>
      </form>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default ChatOverlay;
