import React, { useState } from 'react';
import { Calendar, MapPin, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';

const mockEvents = [
  { id: 1, title: 'Web Summit Rio 2026', date: '15-18 Abril', location: 'Rio de Janeiro', attendees: 450, tags: ['Tech', 'Business', 'Web3'], color: '#6366f1' },
  { id: 2, title: 'Healthcare Innovators Meetup', date: '22 Maio', location: 'São Paulo (Híbrido)', attendees: 120, tags: ['Saúde', 'Networking'], color: '#f59e0b' },
  { id: 3, title: 'Crypto Builders Hackathon', date: '05 Junho', location: 'Online', attendees: 85, tags: ['Web3', 'Dev'], color: '#10b981' },
];

const Events = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [selectedEventInfo, setSelectedEventInfo] = useState(null);

  const handleCheckIn = (eventName) => {
    showToast(`Fazendo check-in no ${eventName}...`, 'info');
    navigate(`/?context=${encodeURIComponent(eventName)}`);
  };

  return (
    <div style={{ padding: '3rem', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Meus <span className="text-gradient">Eventos</span></h1>
        <p style={{ color: 'var(--text-secondary)' }}>Faça check-in em eventos para conectar-se com quem está lá.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
        {mockEvents.map(event => (
          <div key={event.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', background: `${event.color}20`, color: event.color }}>
                <Calendar size={20} />
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Users size={14} /> {event.attendees} confirmados
              </span>
            </div>
            
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>{event.title}</h3>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem' }}>
              <MapPin size={16} /> {event.location} • {event.date}
            </p>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {event.tags.map((tag, idx) => (
                <span key={idx} style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                  {tag}
                </span>
              ))}
            </div>
            
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn-primary" 
                  style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}
                  onClick={() => setSelectedEventInfo(event)}
                >
                  Informações
                </button>
                <button 
                  className="btn-primary" 
                  style={{ flex: 1, background: 'var(--primary-color)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.85rem' }}
                  onClick={() => showToast(`Inscrição para ${event.title} indisponível no momento.`, 'info')}
                >
                  Inscrição
                </button>
              </div>
              <button 
                className="btn-primary" 
                style={{ width: '100%', background: `${event.color}20`, border: `1px solid ${event.color}50`, color: event.color }}
                onClick={() => handleCheckIn(event.title)}
              >
                🕸️ Visualizar a Teia
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Info Modal */}
      {selectedEventInfo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', padding: '2rem', position: 'relative' }}>
            <button onClick={() => setSelectedEventInfo(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
              ✕
            </button>
            <h2 style={{ marginBottom: '0.5rem', color: selectedEventInfo.color }}>{selectedEventInfo.title}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              O maior ponto de encontro para profissionais focados em expandir suas redes e criar soluções inovadoras.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Data e Horário</span>
                <strong>{selectedEventInfo.date} • 09:00 - 18:00</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Localização</span>
                <strong>{selectedEventInfo.location}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Preço Médio</span>
                <strong>R$ 850,00</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Público Alvo</span>
                <strong>Founders, Investidores, Devs</strong>
              </div>
            </div>

            <button 
              className="btn-primary" 
              style={{ width: '100%', marginTop: '2rem', background: 'var(--primary-color)' }}
              onClick={() => { setSelectedEventInfo(null); handleCheckIn(selectedEventInfo.title); }}
            >
              🕸️ Visualizar a Teia do Evento
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;
