import React, { useState } from 'react';
import { X, MessageCircle, Twitter, Linkedin, Instagram, Globe, UserPlus, CheckCircle, Lock, Wallet, Star, Award } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

const ProfileSidebar = ({ node, onClose, onOpenChat, onOpenReview }) => {
  const { showToast } = useToast();
  const [connectionStatus, setConnectionStatus] = useState('none'); // none, pending, following

  if (!node) return null;

  // Helper to get color based on group
  const getGroupColor = (group) => {
    switch(group) {
      case 0: return '#ec4899'; // You
      case 1: return '#6366f1'; // Dev
      case 2: return '#14b8a6'; // Design
      case 3: return '#f59e0b'; // Health
      case 4: return '#8b5cf6'; // Investor
      case 5: return '#10b981'; // Marketing
      default: return '#9aa0a6';
    }
  };

  const getGroupName = (group) => {
    switch(group) {
      case 0: return 'Você';
      case 1: return 'Desenvolvimento';
      case 2: return 'Design & UX';
      case 3: return 'Saúde e Bem-estar';
      case 4: return 'Investimentos';
      case 5: return 'Marketing e Vendas';
      default: return 'Geral';
    }
  };

  const color = getGroupColor(node.group);

  const handleChatClick = () => {
    if (node.isConnectedToMe || node.id === 'Me') {
      if (onOpenChat) onOpenChat(node);
    } else {
      showToast(`Você precisa se conectar com ${node.name} antes de iniciar uma conversa privada.`, 'error');
    }
  };

  const handleConnectClick = () => {
    setConnectionStatus('pending');
    showToast(`Solicitação de conexão enviada para ${node.name}. Agora você está seguindo as atualizações desta pessoa.`, 'info');
  };

  return (
    <div className="profile-sidebar glass-panel">
      {/* Header section with close button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ padding: '0.2rem 0.6rem', borderRadius: '10px', background: node.isConnectedToMe ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)', color: node.isConnectedToMe ? '#10b981' : 'var(--text-secondary)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          {node.isConnectedToMe ? <><CheckCircle size={12} /> Conexão Nível 1</> : <><Lock size={12} /> Fora da Rede</>}
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.5rem' }}>
          <X size={24} />
        </button>
      </div>

      {/* Avatar and Name */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ 
          width: '80px', 
          height: '80px', 
          borderRadius: '50%', 
          background: `linear-gradient(135deg, ${color}, #2a2a35)`,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          fontSize: '2rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          boxShadow: `0 0 20px ${color}40`,
          opacity: node.isConnectedToMe ? 1 : 0.5
        }}>
          {node.isConnectedToMe || node.id === 'Me' ? node.name.charAt(0) : '?'}
        </div>
        <h2 style={{ marginBottom: '0.25rem', textAlign: 'center' }}>{node.isConnectedToMe || node.id === 'Me' ? node.name : 'Usuário Oculto'}</h2>
        <span style={{ color: color, fontSize: '0.9rem', fontWeight: '500' }}>{getGroupName(node.group)}</span>
        
        {/* Location & Company & Specialty */}
        {node.isConnectedToMe && (
          <div style={{ marginTop: '0.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {node.location && (
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                <Globe size={12} /> {node.location}
              </span>
            )}
            {(node.specialty || node.role || (node.companies && node.companies.length > 0)) && (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {node.specialty || node.role}{node.companies && node.companies.length > 0 ? ` · ${Array.isArray(node.companies) ? node.companies.join(', ') : node.companies}` : ''}
              </span>
            )}
          </div>
        )}

        {/* Score Stars */}
        {node.isConnectedToMe && node.score > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.75rem' }}>
            {[1,2,3,4,5].map(s => (
              <Star key={s} size={16} fill={s <= Math.round(node.score) ? '#f59e0b' : 'transparent'} color={s <= Math.round(node.score) ? '#f59e0b' : 'var(--text-secondary)'} />
            ))}
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '0.3rem' }}>
              {node.score} ({node.reviews ? node.reviews.length : 0})
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {node.id !== 'Me' && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
          <button onClick={handleChatClick} className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: node.isConnectedToMe ? 1 : 0.6 }}>
            {node.isConnectedToMe ? <MessageCircle size={18} /> : <Lock size={18} />} Chat
          </button>
          
          {!node.isConnectedToMe && (
            <button 
              onClick={handleConnectClick} 
              disabled={connectionStatus === 'pending'}
              className="btn-primary" 
              style={{ flex: 1, background: connectionStatus === 'pending' ? 'rgba(255,255,255,0.1)' : 'transparent', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: connectionStatus === 'pending' ? 'var(--text-secondary)' : 'var(--text-primary)' }}
            >
              {connectionStatus === 'pending' ? <><CheckCircle size={18} /> Seguindo</> : <><UserPlus size={18} /> Conectar</>}
            </button>
          )}
        </div>
      )}

      {/* Web3 Interaction & Review Buttons */}
      {node.id !== 'Me' && node.isConnectedToMe && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
          <button 
            className="btn-primary" 
            onClick={() => showToast(`Interação Web3 com a carteira de ${node.name} (Em breve)`, 'info')}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', border: '1px dashed rgba(99, 102, 241, 0.4)', fontSize: '0.85rem' }}
          >
            <Wallet size={14} /> Wallet
          </button>
          <button 
            className="btn-primary" 
            onClick={() => onOpenReview && onOpenReview(node)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px dashed rgba(245, 158, 11, 0.4)', fontSize: '0.85rem' }}
          >
            <Award size={14} /> Avaliar
          </button>
        </div>
      )}

      {/* Bio */}
      <div style={{ marginBottom: '2rem' }}>
        <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Sobre</h4>
        <p style={{ fontSize: '0.95rem', lineHeight: '1.5', color: node.isConnectedToMe ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
          {node.isConnectedToMe || node.id === 'Me' 
            ? (node.bio || "Esta pessoa ainda não escreveu uma bio, mas a IA do Connex sugere que vocês podem ter ótimas sinergias.") 
            : "Conecte-se com este usuário para desbloquear seu perfil completo e descobrir interesses em comum."}
        </p>
      </div>

      {/* Skills */}
      {node.skills && node.skills.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Skills</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {node.skills.map((skill, index) => (
              <span key={index} style={{ 
                padding: '0.25rem 0.75rem', 
                background: 'rgba(255,255,255,0.05)', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--radius-lg)',
                fontSize: '0.85rem'
              }}>
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Social Links */}
      <div>
        <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Links</h4>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {node.social?.whatsapp && (
            <a href={`https://wa.me/${node.social.whatsapp}`} target="_blank" rel="noreferrer" style={{ color: '#25D366' }} title="WhatsApp">
              <MessageCircle size={22} />
            </a>
          )}
          {node.social?.linkedin && (
            <a href={node.social.linkedin} target="_blank" rel="noreferrer" style={{ color: '#0077b5' }} title="LinkedIn">
              <Linkedin size={22} />
            </a>
          )}
          {node.social?.twitter && (
            <a href={node.social.twitter} target="_blank" rel="noreferrer" style={{ color: '#1DA1F2' }} title="Twitter">
              <Twitter size={22} />
            </a>
          )}
          {node.social?.instagram && (
            <a href={node.social.instagram} target="_blank" rel="noreferrer" style={{ color: '#E1306C' }} title="Instagram">
              <Instagram size={22} />
            </a>
          )}
          {node.social?.website && (
            <a href={node.social.website} target="_blank" rel="noreferrer" style={{ color: 'var(--text-primary)' }} title="Website">
              <Globe size={22} />
            </a>
          )}
        </div>
      </div>

    </div>
  );
};

export default ProfileSidebar;
