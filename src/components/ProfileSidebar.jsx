import React, { useState, useEffect, useRef } from 'react';
import { X, MessageCircle, Twitter, Linkedin, Instagram, Globe, UserPlus, CheckCircle, Lock, Wallet, Star, Award, Mic, Send, Camera, Image as ImageIcon, FileText, Info, Calendar } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { addNoteToNode, updateMeetingPhoto } from '../lib/mockDataEngine';

const ProfileSidebar = ({ node, onClose, onOpenChat, onOpenReview }) => {
  const { showToast } = useToast();
  const [connectionStatus, setConnectionStatus] = useState('none'); // none, pending, following
  const [activeTab, setActiveTab] = useState('about'); // about, notes, meeting
  const [localNotes, setLocalNotes] = useState([]);
  const [localMeetingPhoto, setLocalMeetingPhoto] = useState(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (node) {
      setLocalNotes(node.notes || []);
      setLocalMeetingPhoto(node.meetingPhoto || null);
      setActiveTab('about');
      setNewNoteText('');
      setIsRecording(false);
    }
  }, [node?.id]);

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

  const handleAddTextNote = () => {
    if (!newNoteText.trim()) return;
    const note = {
      type: 'text',
      text: newNoteText.trim(),
      date: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
    addNoteToNode(node.id, note);
    setLocalNotes([...localNotes, note]);
    setNewNoteText('');
    showToast('Nota salva para a IA.', 'success');
  };

  const handleAddAudioNote = () => {
    if (isRecording) {
      setIsRecording(false);
      const note = {
        type: 'audio',
        text: 'Transcrição simulada: "Encontrei com ' + node.name + ' hoje. Pessoa fantástica, com ótimas ideias."',
        date: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
      addNoteToNode(node.id, note);
      setLocalNotes([...localNotes, note]);
      showToast('Áudio processado e mapeado pela IA.', 'success');
    } else {
      setIsRecording(true);
      showToast('Gravando áudio... Clique novamente para enviar.', 'info');
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target.result;
        updateMeetingPhoto(node.id, url);
        setLocalMeetingPhoto(url);
        showToast('Foto do primeiro encontro salva com sucesso!', 'success');
      };
      reader.readAsDataURL(file);
    }
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

      {/* Tabs */}
      {node.id !== 'Me' && node.isConnectedToMe && (
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
          <button onClick={() => setActiveTab('about')} style={{ flex: 1, padding: '0.75rem 0', background: 'transparent', border: 'none', borderBottom: activeTab === 'about' ? '2px solid #6366f1' : '2px solid transparent', color: activeTab === 'about' ? '#6366f1' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem', transition: 'all 0.2s' }}>
            <Info size={16} /> Sobre
          </button>
          <button onClick={() => setActiveTab('notes')} style={{ flex: 1, padding: '0.75rem 0', background: 'transparent', border: 'none', borderBottom: activeTab === 'notes' ? '2px solid #6366f1' : '2px solid transparent', color: activeTab === 'notes' ? '#6366f1' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem', transition: 'all 0.2s' }}>
            <FileText size={16} /> Notas IA
          </button>
          <button onClick={() => setActiveTab('meeting')} style={{ flex: 1, padding: '0.75rem 0', background: 'transparent', border: 'none', borderBottom: activeTab === 'meeting' ? '2px solid #6366f1' : '2px solid transparent', color: activeTab === 'meeting' ? '#6366f1' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem', transition: 'all 0.2s' }}>
            <Calendar size={16} /> 1º Encontro
          </button>
        </div>
      )}

      {/* Tab Content: ABOUT */}
      {(activeTab === 'about' || !node.isConnectedToMe || node.id === 'Me') && (
        <>
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
      </>
      )}

      {/* Tab Content: NOTES */}
      {activeTab === 'notes' && node.isConnectedToMe && node.id !== 'Me' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.5rem' }}>
            {localNotes.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '1rem' }}>
                Nenhuma nota ainda. Adicione informações sobre {node.name} para a IA mapear suas sinergias e histórico.
              </p>
            ) : (
              localNotes.map((note, idx) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
                    <span>{note.date}</span>
                    <span style={{ color: note.type === 'audio' ? '#10b981' : 'var(--text-secondary)' }}>
                      {note.type === 'audio' ? <Mic size={12} /> : <FileText size={12} />}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: '1.4' }}>{note.text}</p>
                </div>
              ))
            )}
          </div>
          
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
            <textarea 
              placeholder="Adicionar nota para a IA..."
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.85rem', resize: 'none', height: '60px', outline: 'none' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              <button 
                onClick={handleAddAudioNote}
                style={{ background: isRecording ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)', color: isRecording ? '#ef4444' : 'var(--text-secondary)', border: 'none', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', transition: 'all 0.2s' }}
              >
                {isRecording ? <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} /> : <Mic size={14} />}
                {isRecording ? 'Gravando...' : 'Áudio'}
              </button>
              <button 
                onClick={handleAddTextNote}
                disabled={!newNoteText.trim()}
                className="btn-primary"
                style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', opacity: newNoteText.trim() ? 1 : 0.5 }}
              >
                <Send size={14} /> Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: MEETING PHOTO */}
      {activeTab === 'meeting' && node.isConnectedToMe && node.id !== 'Me' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', textAlign: 'center', flex: 1, overflowY: 'auto' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', padding: '0 1rem' }}>
            Salve uma selfie do primeiro encontro com <strong>{node.name}</strong> para lembrar eternamente deste momento.
          </div>
          
          {localMeetingPhoto ? (
            <div style={{ position: 'relative', width: '100%', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
              <img src={localMeetingPhoto} alt="Primeiro Encontro" style={{ width: '100%', display: 'block', objectFit: 'cover', aspectRatio: '4/5' }} />
              <button 
                onClick={() => { setLocalMeetingPhoto(null); updateMeetingPhoto(node.id, null); }}
                style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div style={{ width: '100%', aspectRatio: '4/5', background: 'rgba(255,255,255,0.02)', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => fileInputRef.current?.click()}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Camera size={28} />
              </div>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Adicionar Selfie</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.7 }}>Upload de Imagem</span>
            </div>
          )}
          
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept="image/*"
            onChange={handlePhotoUpload}
          />
        </div>
      )}

    </div>
  );
};

export default ProfileSidebar;
