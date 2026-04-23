import React from 'react';
import { Zap, Coins } from 'lucide-react';
import { getGameState, BADGES } from '../lib/mockDataEngine';

const XPBar = ({ compact = false }) => {
  const state = getGameState();
  const progressPercent = state.next 
    ? ((state.xp - (state.next === 500 ? 150 : state.next === 1000 ? 500 : state.next === 2000 ? 1000 : 0)) / 
       (state.next - (state.next === 500 ? 150 : state.next === 1000 ? 500 : state.next === 2000 ? 1000 : 0))) * 100
    : 100;

  // Simpler progress calculation
  const levels = [0, 150, 500, 1000, 2000];
  const currentLevelMin = levels[state.level - 1] || 0;
  const currentLevelMax = state.next || state.xp;
  const progress = state.next 
    ? ((state.xp - currentLevelMin) / (currentLevelMax - currentLevelMin)) * 100 
    : 100;

  if (compact) {
    return (
      <div style={{ 
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem',
        padding: '0.5rem', width: '100%'
      }}>
        {/* Level Badge */}
        <div style={{ 
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.8rem', fontWeight: 'bold', color: 'white',
          boxShadow: '0 0 12px rgba(245, 158, 11, 0.4)'
        }}>
          {state.level}
        </div>

        {/* XP Mini Bar */}
        <div style={{ 
          width: '100%', height: '3px', background: 'rgba(255,255,255,0.1)', 
          borderRadius: '2px', overflow: 'hidden' 
        }}>
          <div style={{ 
            width: `${Math.min(progress, 100)}%`, height: '100%', 
            background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
            transition: 'width 0.5s ease',
            borderRadius: '2px'
          }} />
        </div>

        {/* Token Count */}
        <div style={{ 
          fontSize: '0.65rem', color: '#f59e0b', display: 'flex', 
          alignItems: 'center', gap: '0.2rem', fontWeight: '600' 
        }}>
          <Coins size={10} /> {state.tokens}
        </div>
      </div>
    );
  }

  // Full version (for Wallet or Profile pages)
  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            width: '48px', height: '48px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.2rem', fontWeight: 'bold', color: 'white',
            boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)'
          }}>
            {state.level}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Nível {state.level} — {state.title}</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {state.xp} XP {state.next ? `/ ${state.next} XP` : '(Máximo)'}
            </span>
          </div>
        </div>
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: '0.5rem', 
          background: 'rgba(245, 158, 11, 0.15)', padding: '0.5rem 1rem', 
          borderRadius: 'var(--radius-lg)', border: '1px solid rgba(245, 158, 11, 0.3)' 
        }}>
          <Coins size={18} color="#f59e0b" />
          <span style={{ fontWeight: '700', fontSize: '1.1rem', color: '#f59e0b' }}>{state.tokens}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>CNX</span>
        </div>
      </div>

      {/* XP Progress Bar */}
      <div style={{ 
        width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', 
        borderRadius: '4px', overflow: 'hidden', marginBottom: '1rem' 
      }}>
        <div style={{ 
          width: `${Math.min(progress, 100)}%`, height: '100%', 
          background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
          transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
          borderRadius: '4px',
          boxShadow: '0 0 10px rgba(245, 158, 11, 0.5)'
        }} />
      </div>

      {/* Badges */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {state.badges.map(badgeId => {
          const badge = BADGES[badgeId];
          if (!badge) return null;
          return (
            <div key={badgeId} title={badge.desc} style={{ 
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.7rem',
              borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)',
              fontSize: '0.8rem', cursor: 'default'
            }}>
              <span>{badge.emoji}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{badge.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default XPBar;
