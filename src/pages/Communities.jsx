import React, { useState } from 'react';
import { Users, Shield, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';

const mockCommunities = [
  { id: 1, name: 'Connex Early Adopters', members: 150, description: 'Beta testers e construtores do Connex.', color: '#ec4899', isMember: true },
  { id: 2, name: 'Devs BR', members: 12500, description: 'A maior comunidade de devs do Brasil.', color: '#6366f1', isMember: false },
  { id: 3, name: 'Web3 Founders', members: 340, description: 'Apenas fundadores de projetos Web3.', color: '#8b5cf6', isMember: true },
  { id: 4, name: 'Clube Imparável', members: 173, description: 'Empreendedores e mentes inquietas.', color: '#f59e0b', isMember: true },
];

const Communities = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [selectedCommInfo, setSelectedCommInfo] = useState(null);

  const handleJoin = (communityName) => {
    showToast(`Entrando na comunidade ${communityName}...`, 'info');
    navigate(`/?context=${encodeURIComponent(communityName)}`);
  };

  return (
    <div style={{ padding: '3rem', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Suas <span className="text-gradient">Comunidades</span></h1>
        <p style={{ color: 'var(--text-secondary)' }}>Gerencie seus grupos e descubra novas redes.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
        {mockCommunities.map(comm => (
          <div key={comm.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', background: `${comm.color}20`, color: comm.color }}>
                {comm.isMember ? <Shield size={24} /> : <Users size={24} />}
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Users size={14} /> {comm.members} membros
              </span>
            </div>
            
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>{comm.name}</h3>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', flex: 1 }}>
              {comm.description}
            </p>
            
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn-primary" 
                  style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}
                  onClick={() => setSelectedCommInfo(comm)}
                >
                  Informações
                </button>
                <button 
                  className="btn-primary" 
                  style={{ flex: 1, background: comm.isMember ? 'var(--primary-color)' : comm.color, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.85rem' }}
                  onClick={() => showToast(comm.isMember ? `Você já está inscrito em ${comm.name}.` : `Solicitação para ${comm.name} enviada!`, 'info')}
                >
                  {comm.isMember ? 'Inscrito' : 'Inscrição'}
                </button>
              </div>
              <button 
                className="btn-primary" 
                style={{ width: '100%', background: `${comm.color}20`, border: `1px solid ${comm.color}50`, color: comm.color }}
                onClick={() => handleJoin(comm.name)}
              >
                🕸️ Visualizar a Teia
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Info Modal */}
      {selectedCommInfo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', padding: '2rem', position: 'relative' }}>
            <button onClick={() => setSelectedCommInfo(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
              ✕
            </button>
            <h2 style={{ marginBottom: '0.5rem', color: selectedCommInfo.color }}>{selectedCommInfo.name}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              {selectedCommInfo.description} Um ambiente seguro para troca de experiências, networking de alto nível e geração de negócios mútuos.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Membros Totais</span>
                <strong>{selectedCommInfo.members} ativos</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Nível de Acesso</span>
                <strong>{selectedCommInfo.isMember ? 'Membro Confirmado' : 'Aberto para Aplicação'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Foco Principal</span>
                <strong>Desenvolvimento Profissional</strong>
              </div>
            </div>

            <button 
              className="btn-primary" 
              style={{ width: '100%', marginTop: '2rem', background: 'var(--primary-color)' }}
              onClick={() => { setSelectedCommInfo(null); handleJoin(selectedCommInfo.name); }}
            >
              🕸️ Visualizar a Teia da Comunidade
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Communities;
