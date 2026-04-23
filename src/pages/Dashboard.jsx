import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import ProfileSidebar from '../components/ProfileSidebar';
import AIAssistant from '../components/AIAssistant';
import ChatOverlay from '../components/ChatOverlay';
import ReviewModal from '../components/ReviewModal';
import CardsView from '../components/CardsView';
import GlobeView from '../components/GlobeView';
import { Sparkles, Network, LayoutGrid, Globe } from 'lucide-react';
import { generateContextData } from '../lib/mockDataEngine';
import { useLocation } from 'react-router-dom';

const Dashboard = () => {
  const fgRef = useRef();
  const containerRef = useRef();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const contextParam = queryParams.get('context');
  
  const [containerDimensions, setContainerDimensions] = useState({ width: 800, height: 600 });
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null); // null means 'All'
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [aiHighlightedIds, setAiHighlightedIds] = useState(null);
  const [activeChatContact, setActiveChatContact] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [viewMode, setViewMode] = useState('web'); // 'web' | 'cards' | 'map'

  // Generate dynamic data based on context
  const contextData = useMemo(() => generateContextData(contextParam), [contextParam]);

  // Resize graph based on container size
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setContainerDimensions({ width: clientWidth, height: clientHeight });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    // Initial Zoom
    setTimeout(() => {
      if (fgRef.current) {
        fgRef.current.zoomToFit(600, 50);
      }
    }, 500);

    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Filter Data Logic
  const graphData = useMemo(() => {
    if (!contextData || !contextData.nodes) return { nodes: [], links: [] };

    let nodesToRender = [...contextData.nodes];

    if (!contextParam) {
      nodesToRender = nodesToRender.filter(n => n.isConnectedToMe || n.id === 'Me');
    }

    if (activeFilter !== null) {
      nodesToRender = nodesToRender.filter(n => n.group === activeFilter || n.id === 'Me');
    }

    const nodeIds = new Set(nodesToRender.map(n => n.id));

    // Pre-seed coordinates to the center of the viewport to avoid top-left jump
    const centerX = containerDimensions.width / 2;
    const centerY = containerDimensions.height / 2;

    nodesToRender.forEach(node => {
      if (node.x === undefined) {
        node.x = centerX + (Math.random() - 0.5) * 100;
        node.y = centerY + (Math.random() - 0.5) * 100;
      }
    });
    
    const filteredLinks = contextData.links.filter(l => {
      if (!l.source || !l.target) return false;
      const sourceId = (typeof l.source === 'object' && l.source !== null) ? l.source.id : l.source;
      const targetId = (typeof l.target === 'object' && l.target !== null) ? l.target.id : l.target;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    return { nodes: nodesToRender, links: filteredLinks };
  }, [activeFilter, contextParam, contextData]);
  // Note: containerDimensions intentionally NOT in deps — avoids re-seeding coords on every resize


  // Force re-zoom removed to prevent extreme zoom-in on initial cluster
  // fgRef.current.zoomToFit(600, 100) was causing the 'disappearing' effect.
  // Instead, we rely on the pre-seeded center positions.

  // Premium Dark Mode Colors for Groups
  const getNodeColor = (node) => {
    switch(node.group) {
      case 0: return '#ec4899'; // You (Pink)
      case 1: return '#6366f1'; // Devs (Indigo)
      case 2: return '#14b8a6'; // Design (Teal)
      case 3: return '#f59e0b'; // Health (Amber)
      case 4: return '#8b5cf6'; // Investor (Violet)
      case 5: return '#10b981'; // Marketing (Emerald)
      default: return '#9aa0a6';
    }
  };

  const getNodeTooltip = useCallback((node) => {
    if (!node.isConnectedToMe && node.id !== 'Me') return 'Usuário Oculto';
    
    // Safely handle companies whether it's an array or a single string
    let companyStr = '';
    if (node.companies) {
      if (Array.isArray(node.companies)) {
        companyStr = node.companies.length > 0 ? node.companies.join(', ') : '';
      } else if (typeof node.companies === 'string') {
        companyStr = node.companies;
      }
    }
    
    const scoreStr = node.score ? `⭐ ${node.score} (${node.reviews ? node.reviews.length : 0} reviews)` : '';
    
    // Using simple HTML string - ForceGraph2D injects this into the tooltip div
    return `<div style="text-align: center; background: rgba(0,0,0,0.8); padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
      <b style="color: white; font-size: 14px;">${node.name}</b><br/>
      <span style="color: #9aa0a6; font-size: 12px;">${node.specialty || node.role}</span>
      ${companyStr ? `<br/><span style="color: #6366f1; font-size: 12px;">${companyStr}</span>` : ''}
      ${scoreStr ? `<br/><span style="color: #f59e0b; font-size: 12px; margin-top: 4px; display: inline-block;">${scoreStr}</span>` : ''}
    </div>`;
  }, []);

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
    // Only try to center on node in web view
    if (viewMode === 'web' && fgRef.current && node.x !== undefined) {
      fgRef.current.centerAt(node.x, node.y, 800);
      fgRef.current.zoom(4, 800);
    }
  }, [viewMode]);

  const handleAIResponse = useCallback((recommendedIds) => {
    setAiHighlightedIds(recommendedIds);
    if (recommendedIds && recommendedIds.length > 0) {
      // Opcional: zoom in on the first recommended node
      // const firstNode = INITIAL_DATA.nodes.find(n => n.id === recommendedIds[0]);
      // if (firstNode && fgRef.current) { ... }
    }
  }, []);

  // Initial camera setup - Fixed zoom levels for impact
  useEffect(() => {
    if (fgRef.current && containerDimensions.width > 0) {
      const initialZoom = !contextParam ? 2.2 : 0.8;
      fgRef.current.zoom(initialZoom, 0);
    }
  }, [contextParam, containerDimensions]);

  return (
    <div style={{ padding: '2rem', height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.2rem' }}>
            <span className="text-gradient">Connex</span> {contextParam ? 'Web' : 'Minha Web'}
            <button 
              className="btn-primary" 
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: 'var(--radius-lg)' }}
              onClick={() => setIsAIOpen(true)}
            >
              <Sparkles size={16} /> Perguntar à IA
            </button>
          </h2>
          {contextParam && (
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Visualizando a web de: <strong>{contextParam}</strong>
            </span>
          )}
        </div>
        
        {/* Right Controls: View Switcher + Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          
          {/* Filter Toolbar - only for Web view */}
          {viewMode === 'web' && (
            <div className="glass-panel" style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem', borderRadius: 'var(--radius-lg)' }}>
              <button 
                className={`btn-primary filter-btn ${activeFilter === null ? 'active' : ''}`} 
                onClick={() => setActiveFilter(null)}
              >
                Todos
              </button>
              <button 
                className={`btn-primary filter-btn ${activeFilter === 1 ? 'active' : ''}`} 
                onClick={() => setActiveFilter(1)}
              >
                💻 Devs
              </button>
              <button 
                className={`btn-primary filter-btn ${activeFilter === 3 ? 'active' : ''}`} 
                onClick={() => setActiveFilter(3)}
              >
                🩺 Saúde
              </button>
              <button 
                className={`btn-primary filter-btn ${activeFilter === 4 ? 'active' : ''}`} 
                onClick={() => setActiveFilter(4)}
              >
                💰 Invest
              </button>
            </div>
          )}

          {/* View Mode Switcher */}
          <div className="glass-panel" style={{ display: 'flex', gap: '0.25rem', padding: '0.35rem', borderRadius: 'var(--radius-lg)' }}>
            {[
              { id: 'web', icon: <Network size={18} />, label: 'Teia' },
              { id: 'cards', icon: <LayoutGrid size={18} />, label: 'Cards' },
              { id: 'map', icon: <Globe size={18} />, label: 'Globo' },
            ].map(v => (
              <button
                key={v.id}
                onClick={() => setViewMode(v.id)}
                title={v.label}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.45rem 0.85rem', borderRadius: 'var(--radius-md)',
                  border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600',
                  transition: 'all 0.2s ease',
                  background: viewMode === v.id ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                  color: viewMode === v.id ? '#6366f1' : 'var(--text-secondary)',
                  boxShadow: viewMode === v.id ? 'inset 0 0 0 1px rgba(99,102,241,0.4)' : 'none',
                }}
              >
                {v.icon} {v.label}
              </button>
            ))}
          </div>
        </div>
      </header>
      
      {/* Main View Container */}
      <div 
        ref={containerRef}
        className="glass-panel" 
        style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: viewMode === 'cards' ? '1.5rem' : '0' }}
      >
        {/* CARDS VIEW */}
        {viewMode === 'cards' && (
          <CardsView nodes={graphData.nodes} onNodeClick={handleNodeClick} />
        )}

        {/* GLOBE VIEW */}
        {viewMode === 'map' && (
          <GlobeView nodes={graphData.nodes} onNodeClick={handleNodeClick} />
        )}

        {/* WEB / FORCE GRAPH VIEW */}
        {viewMode === 'web' && (
          <ForceGraph2D
            ref={fgRef}
            width={containerDimensions.width}
            height={containerDimensions.height}
            graphData={graphData}
          nodeLabel={getNodeTooltip}
          nodeColor={getNodeColor}
          nodeRelSize={4}
          nodeCanvasObjectMode={() => 'replace'}
          linkColor={() => 'rgba(255, 255, 255, 0.08)'}
          linkWidth={link => link.value || 1} 
          backgroundColor="transparent"
          onNodeClick={handleNodeClick}
          onBackgroundClick={() => setSelectedNode(null)}
          cooldownTicks={150}
          d3AlphaDecay={0.01}
          d3VelocityDecay={0.3}
          warmupTicks={5}
          onEngineStop={() => {
            if (fgRef.current) {
              // Final smooth fit
              fgRef.current.zoomToFit(800, 150);
            }
          }}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const isStranger = contextParam && !node.isConnectedToMe && node.id !== 'Me';
            const label = isStranger ? '' : node.name;
            const fontSize = 11/globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            
            const isHighlighted = aiHighlightedIds ? aiHighlightedIds.includes(node.id) : false;
            const isDimmed = aiHighlightedIds && !isHighlighted;
            
            // Smaller size to prevent overlap
            const nodeRadius = 6; 
            
            // Safety: Skip drawing if coordinates are not yet available
            if (node.x === undefined || node.y === undefined || isNaN(node.x) || isNaN(node.y)) return;

            ctx.save();
            
            // Stranger optimization: simple dot
            if (isStranger) {
              ctx.globalAlpha = isDimmed ? 0.1 : 0.3;
              ctx.beginPath();
              ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI, false);
              ctx.fillStyle = '#555555';
              ctx.fill();
            } else {
              // Known Connection: Glassmorphism
              const getNodeBaseColor = (n) => {
                if (n.id === 'Me') return '#ec4899'; // var(--accent-color)
                switch(n.group) {
                  case 1: return '#6366f1';
                  case 2: return '#14b8a6';
                  case 3: return '#f59e0b';
                  case 4: return '#8b5cf6';
                  case 5: return '#10b981';
                  default: return '#9aa0a6';
                }
              };
              const baseColor = getNodeBaseColor(node);
              let r=255, g=255, b=255;
              if (baseColor.startsWith('#')) {
                r = parseInt(baseColor.slice(1,3), 16);
                g = parseInt(baseColor.slice(3,5), 16);
                b = parseInt(baseColor.slice(5,7), 16);
              }
              
              const rgbStr = `${r}, ${g}, ${b}`;
              const alphaMain = isDimmed ? 0.1 : 0.8;

              const gradient = ctx.createRadialGradient(
                node.x - nodeRadius/3, node.y - nodeRadius/3, 1,
                node.x, node.y, nodeRadius
              );
              gradient.addColorStop(0, `rgba(${rgbStr}, ${Math.min(1, alphaMain + 0.2)})`);
              gradient.addColorStop(1, `rgba(${rgbStr}, ${alphaMain * 0.4})`);

              ctx.beginPath();
              ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI, false);
              ctx.fillStyle = gradient;
              ctx.fill();
              
              ctx.lineWidth = 1 / globalScale;
              ctx.strokeStyle = `rgba(${rgbStr}, ${isDimmed ? 0.2 : 0.8})`;
              ctx.stroke();

              // Text Label
              if (label && !isDimmed) {
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.fillText(label, node.x, node.y + nodeRadius + fontSize + 2);
              }
            }
            
            // Selected/Highlight Rings
            if (selectedNode && selectedNode.id === node.id) {
              ctx.beginPath();
              ctx.arc(node.x, node.y, nodeRadius + 3, 0, 2 * Math.PI, false);
              ctx.strokeStyle = 'white';
              ctx.lineWidth = 1.5 / globalScale;
              ctx.stroke();
            }

            if (isHighlighted) {
              ctx.beginPath();
              ctx.arc(node.x, node.y, nodeRadius + 5, 0, 2 * Math.PI, false);
              ctx.strokeStyle = '#ec4899'; // var(--accent-color)
              ctx.lineWidth = 2 / globalScale;
              ctx.stroke();
            }
            
            ctx.restore();
          }}
        />
        )}
      </div>

      {/* Sidebar Component */}
      {selectedNode && (
        <ProfileSidebar 
          node={selectedNode} 
          onClose={() => setSelectedNode(null)} 
          onOpenChat={(node) => setActiveChatContact(node)}
          onOpenReview={(node) => setReviewTarget(node)}
        />
      )}

      {/* AI Spotlight Component */}
      <AIAssistant 
        isOpen={isAIOpen} 
        onClose={() => setIsAIOpen(false)} 
        nodesData={contextData.nodes}
        onAIResponse={handleAIResponse}
      />

      {/* Chat Overlay */}
      <ChatOverlay 
        isOpen={!!activeChatContact} 
        onClose={() => setActiveChatContact(null)} 
        contact={activeChatContact} 
      />

      {/* Review Modal */}
      <ReviewModal
        isOpen={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        contact={reviewTarget}
      />


    </div>
  );
};

export default Dashboard;
