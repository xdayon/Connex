import React, { useState } from 'react';
import { Star, MessageCircle, Award, MapPin, Building2, Search } from 'lucide-react';

const GROUP_COLORS = {
  0: '#ec4899',
  1: '#6366f1',
  2: '#14b8a6',
  3: '#f59e0b',
  4: '#8b5cf6',
  5: '#10b981',
};

const CardsView = ({ nodes, onNodeClick }) => {
  const [search, setSearch] = useState('');

  const connections = nodes.filter(n => n.isConnectedToMe && n.id !== 'Me');

  const filtered = connections.filter(n => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const compStr = Array.isArray(n.companies) ? n.companies.join(' ') : (n.companies || '');
    return (
      n.name?.toLowerCase().includes(q) ||
      n.role?.toLowerCase().includes(q) ||
      n.specialty?.toLowerCase().includes(q) ||
      compStr.toLowerCase().includes(q) ||
      n.skills?.some(s => s.toLowerCase().includes(q)) ||
      n.location?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Search bar */}
      <div style={{ 
        position: 'relative', marginBottom: '1.5rem', flexShrink: 0
      }}>
        <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
        <input
          type="text"
          placeholder={`Buscar entre ${connections.length} conexões...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem 0.75rem 0.75rem 2.5rem',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            color: 'white',
            fontSize: '0.95rem',
          }}
        />
      </div>

      {/* Cards Grid */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1rem',
        alignContent: 'start',
        paddingRight: '4px',
        paddingBottom: '1rem',
      }}>
        {filtered.map(node => {
          const color = GROUP_COLORS[node.group] || '#9aa0a6';
          const companiesStr = Array.isArray(node.companies)
            ? node.companies.join(', ')
            : (node.companies || '');

          return (
            <div
              key={node.id}
              onClick={() => onNodeClick(node)}
              className="glass-panel"
              style={{
                padding: '1.25rem',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                borderLeft: `3px solid ${color}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = `0 8px 30px ${color}30`;
                e.currentTarget.style.borderColor = color;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = '';
                e.currentTarget.style.borderColor = color;
              }}
            >
              {/* Header: Avatar + Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                  background: `linear-gradient(135deg, ${color}cc, ${color}44)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.1rem', fontWeight: 'bold', color: 'white',
                  boxShadow: `0 0 12px ${color}50`,
                }}>
                  {node.name?.charAt(0)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: '600', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {node.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: color, fontWeight: '500' }}>
                    {node.specialty || node.role}
                  </div>
                </div>
              </div>

              {/* Company & Location */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {companiesStr && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <Building2 size={12} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{companiesStr}</span>
                  </div>
                )}
                {node.location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <MapPin size={12} />
                    <span>{node.location}</span>
                  </div>
                )}
              </div>

              {/* Skills */}
              {node.skills && node.skills.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {node.skills.map((skill, i) => (
                    <span key={i} style={{
                      fontSize: '0.72rem', padding: '0.2rem 0.55rem',
                      background: `${color}18`, border: `1px solid ${color}40`,
                      borderRadius: '20px', color: color, fontWeight: '500',
                    }}>
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              {/* Score & Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                {node.score > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={12} fill={s <= Math.round(node.score) ? '#f59e0b' : 'transparent'} color={s <= Math.round(node.score) ? '#f59e0b' : '#444'} />
                    ))}
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginLeft: '0.2rem' }}>
                      {node.score} ({node.reviews?.length || 0})
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Sem reviews</span>
                )}
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    onClick={e => { e.stopPropagation(); onNodeClick(node); }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.3rem', borderRadius: '6px' }}
                    title="Ver Perfil"
                  >
                    <MessageCircle size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
            Nenhuma conexão encontrada para "{search}".
          </div>
        )}
      </div>

      <style>{`
        .glass-panel:hover { border-left-width: 3px !important; }
      `}</style>
    </div>
  );
};

export default CardsView;
