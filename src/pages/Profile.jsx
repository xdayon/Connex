import React, { useState, useEffect } from 'react';
import { Camera, Bot, Sparkles, Network } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { getPersonalWeb, updateMeNode } from '../lib/mockDataEngine';

const Profile = () => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    bio: '',
    skills: '',
    solutions: '',
    companies: '',
    specialty: '',
    linkedin: '',
    twitter: ''
  });

  useEffect(() => {
    const { nodes } = getPersonalWeb();
    const meNode = nodes.find(n => n.id === 'Me');
    if (meNode) {
      setFormData({
        name: meNode.name || '',
        role: meNode.role || '',
        bio: meNode.bio || '',
        skills: meNode.skills ? meNode.skills.join(', ') : '',
        solutions: meNode.solutions || '',
        companies: meNode.companies ? meNode.companies.join(', ') : '',
        specialty: meNode.specialty || '',
        linkedin: meNode.social?.linkedin || '',
        twitter: meNode.social?.twitter || ''
      });
    }
  }, []);
  
  const [isAIThinking, setIsAIThinking] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAutoFillWithAI = () => {
    setIsAIThinking(true);
    showToast('Agente IA analisando suas redes e conexões...', 'info');
    
    setTimeout(() => {
      setFormData({
        name: 'Administrador (AI Optimized)',
        role: 'Visionário Web3 & Network Architect',
        bio: 'Construindo o futuro das redes sociais descentralizadas. Especialista em unir IA com ecossistemas de comunidades.',
        skills: 'Liderança, Visão de Produto, Inteligência Artificial, Web3',
        solutions: 'Consultoria de Networking, Acesso antecipado ao Connex',
        companies: 'Connex',
        specialty: 'Produto & Estratégia',
        linkedin: 'https://linkedin.com/in/admin',
        twitter: 'https://twitter.com/admin'
      });
      setIsAIThinking(false);
      showToast('Perfil preenchido magicamente pela IA!', 'info');
    }, 2000);
  };

  const handleChatWithAI = () => {
    showToast('Iniciando conversa com o Agente Entrevistador... (Em breve)', 'info');
  };

  const handleSave = (e) => {
    e.preventDefault();
    updateMeNode({
      name: formData.name,
      role: formData.role,
      bio: formData.bio,
      skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
      solutions: formData.solutions,
      companies: formData.companies.split(',').map(s => s.trim()).filter(Boolean),
      specialty: formData.specialty,
      social: {
        linkedin: formData.linkedin,
        twitter: formData.twitter
      }
    });
    showToast('Perfil atualizado com sucesso e salvo na teia global!', 'info');
  };

  return (
    <div style={{ padding: '3rem', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Meu <span className="text-gradient">Perfil</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gerencie sua identidade na rede Connex.</p>
        </div>
        
        {/* AI Tools Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
          <button 
            className="btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent-color)' }}
            onClick={handleAutoFillWithAI}
            disabled={isAIThinking}
          >
            <Sparkles size={16} /> {isAIThinking ? 'Analisando...' : 'Preencher com Agente IA'}
          </button>
          <button 
            className="btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: '1px solid var(--accent-color)', color: 'var(--accent-color)' }}
            onClick={handleChatWithAI}
          >
            <Bot size={16} /> Preencher conversando com IA
          </button>
        </div>
      </header>

      <form onSubmit={handleSave} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Photo Upload Area */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ 
              width: '120px', height: '120px', borderRadius: '50%', 
              background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '3rem', fontWeight: 'bold'
            }}>
              {formData.name.charAt(0)}
            </div>
            <button 
              type="button"
              style={{ 
                position: 'absolute', bottom: '0', right: '0', 
                background: 'var(--bg-color)', border: '1px solid var(--border-color)', 
                borderRadius: '50%', padding: '0.5rem', color: 'var(--text-primary)', cursor: 'pointer' 
              }}
            >
              <Camera size={18} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Nome Completo</label>
            <input 
              type="text" name="name" value={formData.name} onChange={handleChange} required
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '0.8rem', borderRadius: 'var(--radius-md)', color: 'white' }}
            />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Cargo / Título</label>
            <input 
              type="text" name="role" value={formData.role} onChange={handleChange} required
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '0.8rem', borderRadius: 'var(--radius-md)', color: 'white' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Empresa(s) <span style={{ fontSize: '0.75rem' }}>(separadas por vírgula)</span></label>
            <input 
              type="text" name="companies" value={formData.companies} onChange={handleChange}
              placeholder="Ex: Connex, Horizon Ventures"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '0.8rem', borderRadius: 'var(--radius-md)', color: 'white' }}
            />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Especialidade Principal</label>
            <input 
              type="text" name="specialty" value={formData.specialty} onChange={handleChange}
              placeholder="Ex: Smart Contracts, UI/UX Design"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '0.8rem', borderRadius: 'var(--radius-md)', color: 'white' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Sobre (Bio)</label>
          <textarea 
            name="bio" rows="4" value={formData.bio} onChange={handleChange}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '0.8rem', borderRadius: 'var(--radius-md)', color: 'white', resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Interesses e Skills (separados por vírgula)</label>
          <input 
            type="text" name="skills" value={formData.skills} onChange={handleChange}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '0.8rem', borderRadius: 'var(--radius-md)', color: 'white' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>O que você oferece? (Produtos, Soluções, Parcerias)</label>
          <textarea 
            name="solutions" rows="2" value={formData.solutions} onChange={handleChange} placeholder="Ex: Procuro sócios, ofereço mentoria em Vendas..."
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '0.8rem', borderRadius: 'var(--radius-md)', color: 'white', resize: 'vertical' }}
          />
        </div>

        {/* Web3 / Social Links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
          <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Network size={18} /> Conexões Externas</h3>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>LinkedIn URL</label>
              <input 
                type="text" name="linkedin" value={formData.linkedin} onChange={handleChange}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '0.6rem', borderRadius: 'var(--radius-sm)', color: 'white' }}
              />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Twitter URL</label>
              <input 
                type="text" name="twitter" value={formData.twitter} onChange={handleChange}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '0.6rem', borderRadius: 'var(--radius-sm)', color: 'white' }}
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            <div>
              <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.2rem' }}>Identidade Web3</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Conecte sua carteira para exibir seus NFTs e tokens na sua Web.</p>
            </div>
            <button type="button" className="btn-primary" style={{ background: '#6366f1', fontSize: '0.85rem' }} onClick={() => showToast('Iniciando Web3 Provider (Em breve)', 'info')}>
              Conectar Wallet
            </button>
          </div>
        </div>

        {/* Profile Completeness */}
        {(() => {
          const fields = [formData.name, formData.role, formData.bio, formData.skills, formData.solutions, formData.companies, formData.specialty, formData.linkedin, formData.twitter];
          const filled = fields.filter(f => f && f.trim().length > 0).length;
          const percent = Math.round((filled / fields.length) * 100);
          return (
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem' }}>Completude do Perfil</span>
                <span style={{ fontSize: '0.9rem', color: percent === 100 ? '#10b981' : '#f59e0b', fontWeight: '600' }}>{percent}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${percent}%`, height: '100%', background: percent === 100 ? '#10b981' : 'linear-gradient(90deg, #f59e0b, #ef4444)', transition: 'width 0.5s ease', borderRadius: '3px' }} />
              </div>
              {percent < 100 && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem', margin: '0.5rem 0 0' }}>🎮 Complete 100% para ganhar +100 XP e +5 CNX!</p>}
            </div>
          );
        })()}

        <button type="submit" className="btn-primary" style={{ marginTop: '1rem', padding: '1rem', fontSize: '1.1rem' }}>
          Salvar Perfil
        </button>

      </form>
    </div>
  );
};

export default Profile;
