import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GitBranch, Layers } from 'lucide-react';

const GROUP_COLORS = {
  0: '#ec4899',
  1: '#6366f1',
  2: '#14b8a6',
  3: '#f59e0b',
  4: '#8b5cf6',
  5: '#10b981',
};

// Lazy import globe to handle if not installed yet
let GlobeCmp = null;

const GlobeView = ({ nodes, onNodeClick }) => {
  const globeRef = useRef();
  const containerRef = useRef();
  const [showArcs, setShowArcs] = useState(true);
  const [GlobeComponent, setGlobeComponent] = useState(null);
  const [libLoaded, setLibLoaded] = useState(false);
  const [dimensions, setDimensions] = useState({ w: 800, h: 600 });
  const [hoveredNode, setHoveredNode] = useState(null);

  // Dynamically import the library
  useEffect(() => {
    import('react-globe.gl')
      .then(mod => {
        setGlobeComponent(() => mod.default);
        setLibLoaded(true);
      })
      .catch(() => {
        setLibLoaded(false);
      });
  }, []);

  // Measure container
  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        setDimensions({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const myNode = nodes.find(n => n.id === 'Me');
  const connections = nodes.filter(n => n.isConnectedToMe && n.id !== 'Me' && n.lat && n.lng);

  // Build arcs: Me -> each connection
  const arcsData = connections.map(n => ({
    startLat: myNode?.lat || -23.55,
    startLng: myNode?.lng || -46.63,
    endLat: n.lat,
    endLng: n.lng,
    color: GROUP_COLORS[n.group] || '#6366f1',
    node: n,
  }));

  // Build point data
  const pointsData = [
    ...(myNode ? [{
      lat: myNode.lat,
      lng: myNode.lng,
      name: myNode.name,
      color: '#ec4899',
      size: 0.8,
      node: myNode,
    }] : []),
    ...connections.map(n => ({
      lat: n.lat,
      lng: n.lng,
      name: n.name,
      color: GROUP_COLORS[n.group] || '#6366f1',
      size: 0.4,
      node: n,
    })),
  ];

  const handlePointClick = useCallback((point) => {
    if (point.node) onNodeClick(point.node);
  }, [onNodeClick]);

  // Initial camera angle — centered on South America
  useEffect(() => {
    if (globeRef.current && libLoaded) {
      setTimeout(() => {
        if (globeRef.current?.pointOfView) {
          globeRef.current.pointOfView({ lat: -15, lng: -50, altitude: 2.2 }, 1000);
        }
      }, 800);
    }
  }, [libLoaded]);

  if (!libLoaded && GlobeComponent === null) {
    return (
      <div ref={containerRef} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '3rem' }}>🌐</div>
        <p style={{ textAlign: 'center', maxWidth: '400px' }}>
          A visualização de Globo 3D requer uma dependência adicional.<br/>
          <strong style={{ color: 'white' }}>Execute no terminal do projeto:</strong>
        </p>
        <code style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)', color: '#6366f1', fontSize: '1rem' }}>
          npm install react-globe.gl three
        </code>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Após instalar, volte a esta aba e recarregue a página.</p>
      </div>
    );
  }

  if (!GlobeComponent) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Carregando Globo 3D...</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-xl)' }}>
      {/* Controls */}
      <div style={{
        position: 'absolute', top: '1rem', right: '1rem', zIndex: 10,
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
      }}>
        {/* Arc toggle */}
        <button
          onClick={() => setShowArcs(v => !v)}
          title={showArcs ? 'Ocultar conexões' : 'Mostrar conexões'}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-lg)',
            background: showArcs ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255,255,255,0.08)',
            border: showArcs ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid var(--border-color)',
            color: showArcs ? '#6366f1' : 'var(--text-secondary)',
            cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s ease',
          }}
        >
          <GitBranch size={14} />
          {showArcs ? 'Conexões: ON' : 'Conexões: OFF'}
        </button>

        {/* Stats */}
        <div style={{
          padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-lg)',
          background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)',
          backdropFilter: 'blur(8px)', fontSize: '0.78rem', color: 'var(--text-secondary)',
          display: 'flex', alignItems: 'center', gap: '0.4rem',
        }}>
          <Layers size={12} />
          {connections.length} conexões no mapa
        </div>
      </div>

      {/* Hovered label */}
      {hoveredNode && (
        <div style={{
          position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 'var(--radius-lg)', padding: '0.5rem 1rem',
          color: 'white', fontSize: '0.85rem', zIndex: 10, pointerEvents: 'none',
          display: 'flex', gap: '0.75rem', alignItems: 'center',
        }}>
          <span style={{ color: GROUP_COLORS[hoveredNode.group] || '#6366f1', fontWeight: '700' }}>●</span>
          <span><b>{hoveredNode.name}</b> · {hoveredNode.specialty || hoveredNode.role}</span>
          {hoveredNode.location && <span style={{ color: 'var(--text-secondary)' }}>📍 {hoveredNode.location}</span>}
        </div>
      )}

      <GlobeComponent
        ref={globeRef}
        width={dimensions.w}
        height={dimensions.h}
        // Globe appearance
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="rgba(0,0,0,0)"
        atmosphereColor="#6366f1"
        atmosphereAltitude={0.15}
        // Points
        pointsData={pointsData}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointRadius="size"
        pointAltitude={0.01}
        pointResolution={16}
        onPointClick={handlePointClick}
        onPointHover={point => setHoveredNode(point ? point.node : null)}
        // Arcs (connections)
        arcsData={showArcs ? arcsData : []}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor={arc => [arc.color + '30', arc.color + 'cc', arc.color + '30']}
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={3000}
        arcStroke={0.4}
        arcAltitude={0.15}
      />
    </div>
  );
};

export default GlobeView;
