import React, { useState } from 'react';
import { Search, Sparkles, Star, Users, Briefcase, Zap, Bot, MessageSquare } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

const Explore = () => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('match');

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    showToast(`Buscando por "${searchQuery}" na teia... (Em breve)`, 'info');
  };

  const handleConnect = (name) => {
    showToast(`Solicitação de conexão enviada para ${name}!`, 'info');
  };

  return (
    <div style={{ padding: '3rem', maxWidth: '1000px', margin: '0 auto', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Encontrar <span className="text-gradient">Conexões</span></h1>
        <p style={{ color: 'var(--text-secondary)' }}>Expanda sua rede estrategicamente através de inteligência artificial.</p>
      </header>

      {/* AI Search Bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Bot size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-color)' }} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Converse com a IA: 'Quero conhecer especialistas em UI/UX em São Paulo...'"
            style={{ 
              width: '100%', padding: '1rem 1rem 1rem 3rem', borderRadius: 'var(--radius-lg)', 
              border: '1px solid var(--accent-color)', background: 'rgba(255,255,255,0.05)', 
              color: 'white', fontSize: '1rem', outline: 'none', boxShadow: '0 0 10px rgba(236, 72, 153, 0.2)' 
            }}
          />
        </div>
        <button type="submit" className="btn-primary" style={{ padding: '0 2rem', background: 'var(--accent-color)' }}>
          <Sparkles size={20} /> Procurar
        </button>
      </form>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <button className={`filter-btn ${activeTab === 'match' ? 'active' : ''}`} onClick={() => setActiveTab('match')} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Zap size={16} /> Match Automático
        </button>
        <button className={`filter-btn ${activeTab === 'clients' ? 'active' : ''}`} onClick={() => setActiveTab('clients')} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Users size={16} /> Clientes Potenciais
        </button>
        <button className={`filter-btn ${activeTab === 'partners' ? 'active' : ''}`} onClick={() => setActiveTab('partners')} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Briefcase size={16} /> Parceiros & Fornecedores
        </button>
        <button className={`filter-btn ${activeTab === 'premium' ? 'active' : ''}`} onClick={() => setActiveTab('premium')} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#f59e0b', borderColor: activeTab === 'premium' ? '#f59e0b' : 'transparent' }}>
          <Star size={16} /> Alto Nível
        </button>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem' }}>
        
        {activeTab === 'match' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>FC</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ margin: 0 }}>Felipe Costa</h3>
                  <span style={{ fontSize: '0.75rem', background: 'rgba(236,72,153,0.2)', color: '#ec4899', padding: '0.2rem 0.5rem', borderRadius: '10px' }}>98% Match</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.2rem 0' }}>Engenheiro Blockchain sênior. 5 conexões em comum.</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', border: '1px solid var(--border-color)', borderRadius: '5px' }}>Rust</span>
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', border: '1px solid var(--border-color)', borderRadius: '5px' }}>Web3</span>
                </div>
              </div>
              <button className="btn-primary" onClick={() => handleConnect('Felipe Costa')}>Conectar</button>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#14b8a6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>MR</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ margin: 0 }}>Mariana Ribeiro</h3>
                  <span style={{ fontSize: '0.75rem', background: 'rgba(236,72,153,0.2)', color: '#ec4899', padding: '0.2rem 0.5rem', borderRadius: '10px' }}>95% Match</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.2rem 0' }}>Product Manager. Participaram do mesmo evento (Web Summit).</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', border: '1px solid var(--border-color)', borderRadius: '5px' }}>Produto</span>
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', border: '1px solid var(--border-color)', borderRadius: '5px' }}>Liderança</span>
                </div>
              </div>
              <button className="btn-primary" onClick={() => handleConnect('Mariana Ribeiro')}>Conectar</button>
            </div>
          </div>
        )}

        {activeTab === 'premium' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '1rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Star color="#f59e0b" />
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#f59e0b' }}>Esta aba mostra executivos, investidores e sócios que correspondem à sua tese de negócios.</p>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>JL</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0 }}>João Lucas</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.2rem 0' }}>Managing Partner @ Horizon Ventures. Foco em SaaS e Web3.</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6', borderRadius: '5px' }}>Investidor Anjo</span>
                </div>
              </div>
              <button className="btn-primary" style={{ background: '#f59e0b', color: 'black' }} onClick={() => showToast('Solicitação Premium enviada com pitch de introdução!', 'success')}>Solicitar Intro</button>
            </div>
          </div>
        )}

        {/* Placeholders for other tabs */}
        {(activeTab === 'clients' || activeTab === 'partners') && (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
            <Search size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <h3>Nenhum resultado direto ainda</h3>
            <p>O Connex está varrendo a teia. Preencha mais detalhadamente a aba de 'O que você oferece' no seu Perfil para atrair mais matches nesta categoria.</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default Explore;
