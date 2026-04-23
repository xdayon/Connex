import React, { useState } from 'react';
import { Star, X, Send } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { addReviewToNode, addXPAndTokens } from '../lib/mockDataEngine';

const ReviewModal = ({ isOpen, onClose, contact }) => {
  const { showToast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewType, setReviewType] = useState('Parceria');
  const [reviewText, setReviewText] = useState('');

  if (!isOpen || !contact) return null;

  const handleSubmit = () => {
    if (rating === 0) {
      showToast('Selecione uma avaliação de 1 a 5 estrelas.', 'info');
      return;
    }

    const review = {
      id: `rev_${Date.now()}`,
      author: 'Você (Admin)',
      rating,
      type: reviewType,
      text: reviewText || 'Sem comentário adicional.',
      date: new Date().toLocaleDateString('pt-BR')
    };

    addReviewToNode(contact.id, review);
    const newState = addXPAndTokens(40, 8, `Avaliou parceria com ${contact.name}`);
    
    showToast(`Review enviada! +40 XP e +8 CNX 🎉`, 'info');
    setRating(0);
    setReviewText('');
    onClose();
  };

  const types = ['Contratação', 'Parceria', 'Mentoria', 'Indicação'];

  return (
    <div style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      background: 'rgba(0,0,0,0.85)', zIndex: 300, 
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.2s ease'
    }}>
      <div className="glass-panel" style={{ 
        width: '90%', maxWidth: '460px', padding: '2rem', position: 'relative' 
      }}>
        <button onClick={onClose} style={{ 
          position: 'absolute', top: '15px', right: '15px', 
          background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' 
        }}>
          <X size={20} />
        </button>

        <h2 style={{ marginBottom: '0.3rem' }}>Avaliar Parceria</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Como foi trabalhar com <strong style={{ color: 'white' }}>{contact.name}</strong>?
        </p>

        {/* Star Rating */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
              style={{ 
                background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem',
                transform: (hoverRating >= star || rating >= star) ? 'scale(1.2)' : 'scale(1)',
                transition: 'all 0.15s ease'
              }}
            >
              <Star 
                size={32} 
                fill={(hoverRating >= star || rating >= star) ? '#f59e0b' : 'transparent'}
                color={(hoverRating >= star || rating >= star) ? '#f59e0b' : 'var(--text-secondary)'}
              />
            </button>
          ))}
        </div>

        {/* Type Selection */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>
            Tipo de Negócio
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {types.map(type => (
              <button
                key={type}
                onClick={() => setReviewType(type)}
                className={`filter-btn ${reviewType === type ? 'active' : ''}`}
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Text Review */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>
            Comentário (opcional)
          </label>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Como foi a experiência? O que essa pessoa faz de especial?"
            rows={3}
            style={{ 
              width: '100%', background: 'rgba(255,255,255,0.05)', 
              border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
              padding: '0.8rem', color: 'white', resize: 'vertical', fontFamily: 'Inter, sans-serif'
            }}
          />
        </div>

        {/* Reward Preview */}
        <div style={{ 
          background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)',
          borderRadius: 'var(--radius-md)', padding: '0.75rem', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem',
          fontSize: '0.85rem'
        }}>
          <span style={{ color: '#f59e0b' }}>🎮 Recompensa:</span>
          <span style={{ color: '#10b981' }}>+40 XP</span>
          <span style={{ color: '#f59e0b' }}>+8 CNX</span>
        </div>

        <button 
          onClick={handleSubmit} 
          className="btn-primary" 
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          <Send size={16} /> Enviar Avaliação
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default ReviewModal;
