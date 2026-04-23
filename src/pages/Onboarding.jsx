import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const Onboarding = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    area: '0',
    bio: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // For now we mock the submission and just go to dashboard
    // Later we will link this to the Supabase 'profiles' table
    setTimeout(() => {
      setLoading(false);
      navigate('/');
    }, 1000);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center' }}>
      <h2 style={{ marginBottom: '1rem', textAlign: 'center' }}>Complete o seu <span className="text-gradient">Perfil</span></h2>
      <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '2rem' }}>
        Antes de ver a sua rede de conexões, conte-nos um pouco sobre você.
      </p>

      <div className="glass-panel" style={{ padding: '2.5rem' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Como você quer ser chamado?</label>
            <input 
              type="text" 
              placeholder="Seu Nome Profissional" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Qual a sua área principal?</label>
            <select 
              value={formData.area}
              onChange={(e) => setFormData({...formData, area: e.target.value})}
              style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: '#121217', color: 'white', appearance: 'none' }}
            >
              <option value="0">Empreendedor / CEO</option>
              <option value="1">Desenvolvimento de Software</option>
              <option value="2">Design e Criatividade</option>
              <option value="3">Saúde e Bem-estar</option>
              <option value="4">Investimentos e Finanças</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Uma breve Bio (opcional)</label>
            <textarea 
              placeholder="No que você é especialista? O que você busca?" 
              value={formData.bio}
              onChange={(e) => setFormData({...formData, bio: e.target.value})}
              rows="3"
              style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'white', resize: 'vertical' }}
            />
          </div>

          <div style={{ marginTop: '1rem', padding: '1.5rem', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.05)', border: '1px dashed rgba(99, 102, 241, 0.3)' }}>
            <h4 style={{ marginBottom: '0.5rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Wallet size={18} color="var(--primary-color)" /> Web3 Identity
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Conecte sua carteira para que o Connex analise seus tokens/NFTs e preencha suas skills e comunidades automaticamente.
            </p>
            <button 
              type="button" 
              onClick={() => alert('Abrindo modal do WalletConnect / Metamask... (Mock)')}
              style={{ padding: '0.6rem 1rem', borderRadius: 'var(--radius-sm)', background: '#1a1b1f', color: 'white', border: '1px solid #2d2f36', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}
            >
              Conectar Carteira
            </button>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button 
              type="submit" 
              className="btn-primary" 
              style={{ flex: 1 }}
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Entrar no Connex'}
            </button>
            <button 
              type="button" 
              className="btn-primary" 
              style={{ flex: 1, background: 'transparent', border: '1px solid var(--primary-color)' }}
              onClick={() => alert('Integração com IA em breve!')}
            >
              ✨ Preencher com IA
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default Onboarding;
