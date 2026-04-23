import React from 'react';
import { Wallet as WalletIcon, Coins, ShieldCheck, Zap, TrendingUp, Gift, Users, Calendar, Star, Award } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { getGameState, BADGES } from '../lib/mockDataEngine';
import XPBar from '../components/XPBar';

const Wallet = () => {
  const { showToast } = useToast();
  const state = getGameState();

  const earnMethods = [
    { icon: <Users size={18} />, action: 'Convidar alguém', xp: 50, cnx: 10 },
    { icon: <Star size={18} />, action: 'Completar perfil', xp: 100, cnx: 5 },
    { icon: <Calendar size={18} />, action: 'Check-in em evento', xp: 30, cnx: 5 },
    { icon: <Award size={18} />, action: 'Avaliar uma parceria', xp: 40, cnx: 8 },
    { icon: <TrendingUp size={18} />, action: 'Fechar negócio na plataforma', xp: 100, cnx: 20 },
    { icon: <Gift size={18} />, action: 'Registrar comunidade ou evento', xp: 200, cnx: 50 },
  ];

  return (
    <div style={{ padding: '3rem', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Identidade <span className="text-gradient">Web3</span></h1>
        <p style={{ color: 'var(--text-secondary)' }}>Seu capital social tokenizado. Ganhe CNX construindo sua teia.</p>
      </header>

      {/* Full XP Bar */}
      <XPBar compact={false} />

      {/* Wallet Connection Card */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem', background: 'linear-gradient(to right, rgba(99, 102, 241, 0.1), rgba(236, 72, 153, 0.05))' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #6366f1', flexShrink: 0 }}>
          <WalletIcon size={28} color="#6366f1" />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ marginBottom: '0.3rem' }}>Carteira Não Conectada</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Conecte MetaMask ou WalletConnect para emitir Proof of Meetings on-chain.
          </p>
        </div>
        <button 
          className="btn-primary" 
          style={{ background: '#6366f1', flexShrink: 0 }}
          onClick={() => showToast('Inicializando provedor Web3... (Em breve)', 'info')}
        >
          Conectar
        </button>
      </div>

      {/* Two Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Token Balance */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Coins color="#f59e0b" size={20} />
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Saldo CNX</h3>
          </div>
          <h1 style={{ fontSize: '2.5rem', margin: '0.5rem 0', color: '#f59e0b' }}>{state.tokens}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>
            Tokens acumulados por networking ativo.
          </p>
        </div>

        {/* POAP */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <ShieldCheck color="#10b981" size={20} />
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Proof of Meeting</h3>
          </div>
          <h1 style={{ fontSize: '2.5rem', margin: '0.5rem 0', color: '#10b981' }}>0</h1>
          <button 
            className="btn-primary" 
            style={{ width: '100%', background: 'transparent', border: '1px solid var(--border-color)', color: 'white', display: 'flex', gap: '0.5rem', justifyContent: 'center', fontSize: '0.85rem' }}
            onClick={() => showToast('Abrindo scanner de QR Code...', 'info')}
          >
            <Zap size={14} /> Emitir Encontro
          </button>
        </div>
      </div>

      {/* How to Earn */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={18} color="#10b981" /> Como Ganhar Tokens
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {earnMethods.map((method, i) => (
            <div key={i} style={{ 
              display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem',
              background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ color: 'var(--text-secondary)' }}>{method.icon}</div>
              <span style={{ flex: 1, fontSize: '0.9rem' }}>{method.action}</span>
              <span style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: '600' }}>+{method.xp} XP</span>
              <span style={{ color: '#f59e0b', fontSize: '0.85rem', fontWeight: '600' }}>+{method.cnx} CNX</span>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Histórico de Transações</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {state.transactions.map(tx => (
            <div key={tx.id} style={{ 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.75rem', borderBottom: '1px solid var(--border-color)'
            }}>
              <div>
                <span style={{ fontSize: '0.9rem' }}>{tx.reason}</span>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{tx.date}</div>
              </div>
              <span style={{ 
                fontWeight: '700', fontSize: '0.95rem',
                color: tx.amount >= 0 ? '#10b981' : '#ef4444'
              }}>
                {tx.amount >= 0 ? '+' : ''}{tx.amount} CNX
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Wallet;
