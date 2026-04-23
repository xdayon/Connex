// Data seeds for realistic generation
const firstNames = ['Thiago', 'Mariana', 'Lucas', 'Camila', 'Rafael', 'Julia', 'Pedro', 'Sofia', 'Felipe', 'Beatriz', 'Arthur', 'Larissa', 'Bruno', 'Isabella', 'Diego', 'Letícia', 'Gabriel', 'Valentina', 'Mateus', 'Carolina'];
const lastNames = ['Cardoso', 'Silva', 'Costa', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Ribeiro', 'Carvalho', 'Lopes', 'Mendes', 'Nunes', 'Machado', 'Fernandes', 'Rocha'];

// Global geo-location pool — weighted toward Brazil, spread globally
const geoLocations = [
  { city: 'São Paulo, BR', lat: -23.55, lng: -46.63, weight: 25 },
  { city: 'Rio de Janeiro, BR', lat: -22.90, lng: -43.17, weight: 15 },
  { city: 'Belo Horizonte, BR', lat: -19.91, lng: -43.94, weight: 8 },
  { city: 'Florianópolis, BR', lat: -27.59, lng: -48.54, weight: 5 },
  { city: 'Lisboa, PT', lat: 38.72, lng: -9.14, weight: 8 },
  { city: 'San Francisco, US', lat: 37.77, lng: -122.41, weight: 8 },
  { city: 'New York, US', lat: 40.71, lng: -74.00, weight: 6 },
  { city: 'London, UK', lat: 51.50, lng: -0.12, weight: 5 },
  { city: 'Berlin, DE', lat: 52.52, lng: 13.40, weight: 4 },
  { city: 'Dubai, UAE', lat: 25.20, lng: 55.27, weight: 4 },
  { city: 'Singapore, SG', lat: 1.35, lng: 103.82, weight: 3 },
  { city: 'Miami, US', lat: 25.77, lng: -80.19, weight: 4 },
  { city: 'Amsterdam, NL', lat: 52.37, lng: 4.90, weight: 2 },
  { city: 'Buenos Aires, AR', lat: -34.60, lng: -58.38, weight: 3 },
  { city: 'Mexico City, MX', lat: 19.43, lng: -99.13, weight: 2 },
  { city: 'Tel Aviv, IL', lat: 32.08, lng: 34.78, weight: 2 },
  { city: 'Tokyo, JP', lat: 35.68, lng: 139.69, weight: 2 },
  { city: 'Toronto, CA', lat: 43.65, lng: -79.38, weight: 2 },
  { city: 'Sydney, AU', lat: -33.87, lng: 151.21, weight: 1 },
];

const weightedGeoLocation = () => {
  const totalWeight = geoLocations.reduce((sum, l) => sum + l.weight, 0);
  let random = Math.random() * totalWeight;
  for (const loc of geoLocations) {
    random -= loc.weight;
    if (random <= 0) return { ...loc, lat: loc.lat + (Math.random() - 0.5) * 1.5, lng: loc.lng + (Math.random() - 0.5) * 1.5 };
  }
  return geoLocations[0];
};

const companies = [
  'Connex', 'Horizon Ventures', 'NovaTech', 'HealthBridge', 'CryptoLab',
  'Fundação Imparável', 'Stellar Design Co.', 'AgroSmart', 'FinEdge',
  'Código Aberto', 'BioSynth', 'MetaForge', 'PulseAI', 'TokenHaus',
  'Urban Dynamics', 'Quantica', 'SolFlow', 'RedPill Studios', 'Nexo Digital', 'Ether Labs'
];

const specialties = [
  'Smart Contracts', 'UI/UX Design', 'Growth Marketing', 'Inteligência Artificial',
  'Venture Capital', 'Saúde Digital', 'Tokenomics', 'Branding',
  'Engenharia de Dados', 'Produto & Estratégia', 'DevOps', 'Community Building'
];

const reviewTexts = [
  'Excelente profissional! Entregou acima do esperado.',
  'Parceria incrível. Recomendo demais.',
  'Muito organizado e comprometido com prazos.',
  'Comunicação clara e resultado de alto nível.',
  'Trouxe insights valiosos para o projeto.',
  'Trabalho impecável. Já estamos planejando o próximo.',
  'Super criativo, trouxe soluções que eu nem imaginava.',
  'Ótimo para trabalhar em equipe. Muito colaborativo.',
];

const roles = [
  { group: 1, title: 'Engenheiro Frontend', skills: ['React', 'TypeScript', 'CSS'] },
  { group: 1, title: 'Desenvolvedor Backend', skills: ['Node.js', 'Rust', 'PostgreSQL'] },
  { group: 1, title: 'Especialista Web3', skills: ['Solidity', 'Smart Contracts', 'Ethers.js'] },
  { group: 2, title: 'Product Designer', skills: ['Figma', 'UI/UX', 'Design Systems'] },
  { group: 2, title: 'Ilustrador 3D', skills: ['Blender', 'Cinema4D', 'Animação'] },
  { group: 3, title: 'Nutricionista', skills: ['Performance', 'Longevidade', 'Dieta'] },
  { group: 3, title: 'Pesquisador Médico', skills: ['Telemedicina', 'HealthTech'] },
  { group: 4, title: 'Angel Investor', skills: ['Venture Capital', 'M&A', 'Startups'] },
  { group: 4, title: 'Partner em Fundo', skills: ['ESG', 'Análise de Risco'] },
  { group: 5, title: 'Growth Hacker', skills: ['SEO', 'Métricas', 'Conversão'] },
  { group: 5, title: 'Copywriter', skills: ['Escrita Persuasiva', 'Marketing'] },
];

const generateName = () => `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;

const pickRandom = (arr, count = 1) => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return count === 1 ? shuffled[0] : shuffled.slice(0, count);
};

const generateReviews = (nodeName, count) => {
  const reviews = [];
  for (let i = 0; i < count; i++) {
    reviews.push({
      id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      author: generateName(),
      rating: Math.floor(Math.random() * 2) + 4, // 4 or 5
      type: pickRandom(['Contratação', 'Parceria', 'Mentoria', 'Indicação']),
      text: pickRandom(reviewTexts),
      date: `${Math.floor(Math.random() * 28) + 1}/0${Math.floor(Math.random() * 4) + 1}/2026`
    });
  }
  return reviews;
};

const getLevel = (xp) => {
  if (xp >= 2000) return { level: 5, title: 'Oracle', next: null };
  if (xp >= 1000) return { level: 4, title: 'Hub', next: 2000 };
  if (xp >= 500) return { level: 3, title: 'Bridge', next: 1000 };
  if (xp >= 150) return { level: 2, title: 'Connector', next: 500 };
  return { level: 1, title: 'Node', next: 150 };
};

// Global memory to keep the "Personal Web" consistent across re-renders
let personalWebCache = null;

// Global gamification state
let gameState = {
  xp: 420,
  tokens: 85,
  badges: ['web_starter', 'profile_complete'],
  transactions: [
    { id: 1, type: 'earn', amount: 50, reason: 'Convidou Mariana Ribeiro', date: '18/04/2026' },
    { id: 2, type: 'earn', amount: 10, reason: 'Check-in no Web Summit', date: '15/04/2026' },
    { id: 3, type: 'earn', amount: 5, reason: 'Perfil completado', date: '12/04/2026' },
    { id: 4, type: 'earn', amount: 8, reason: 'Avaliou parceria com Felipe Costa', date: '10/04/2026' },
    { id: 5, type: 'spend', amount: -15, reason: 'Solicitação Premium para João Lucas', date: '09/04/2026' },
    { id: 6, type: 'earn', amount: 20, reason: 'Negócio fechado via Connex', date: '05/04/2026' },
  ]
};

export const getGameState = () => {
  const levelInfo = getLevel(gameState.xp);
  return { ...gameState, ...levelInfo };
};

export const addXPAndTokens = (xpAmount, tokenAmount, reason) => {
  gameState.xp += xpAmount;
  gameState.tokens += tokenAmount;
  gameState.transactions.unshift({
    id: Date.now(),
    type: tokenAmount >= 0 ? 'earn' : 'spend',
    amount: tokenAmount,
    reason,
    date: new Date().toLocaleDateString('pt-BR')
  });
  return getGameState();
};

export const addBadge = (badgeId) => {
  if (!gameState.badges.includes(badgeId)) {
    gameState.badges.push(badgeId);
  }
};

export const getPersonalWeb = () => {
  if (!personalWebCache) {
    const nodes = [
      { 
        id: 'Me', group: 0, val: 30, name: 'Você (Admin)', role: 'Fundador do Connex', isConnectedToMe: true, 
        bio: 'Explorando as fronteiras de IA e Redes Pessoais.', skills: ['Liderança', 'Visão de Produto'],
        companies: ['Connex'],
        specialty: 'Produto & Estratégia',
        score: 4.9,
        reviews: generateReviews('Você', 3),
        lat: -23.55, lng: -46.63, location: 'São Paulo, BR',
        social: { twitter: 'https://twitter.com', linkedin: 'https://linkedin.com' } 
      }
    ];
    
    const links = [];

    // Generate 40 direct connections
    for (let i = 1; i <= 40; i++) {
      const roleObj = roles[Math.floor(Math.random() * roles.length)];
      const nodeName = generateName();
      const id = `Conn_${i}`;
      
      const numReviews = Math.floor(Math.random() * 8);
      const nodeReviews = generateReviews(nodeName, numReviews);
      const avgScore = nodeReviews.length > 0 
        ? Math.round((nodeReviews.reduce((sum, r) => sum + r.rating, 0) / nodeReviews.length) * 10) / 10
        : 0;

      const numCompanies = Math.random() > 0.7 ? 2 : 1;
      
      nodes.push({
        id,
        group: roleObj.group,
        val: Math.floor(Math.random() * 8) + 12, 
        name: nodeName,
        role: roleObj.title,
        isConnectedToMe: true,
        bio: `Profissional dedicado atuando como ${roleObj.title}.`,
        skills: roleObj.skills,
        companies: Array.isArray(pickRandom(companies, numCompanies)) ? pickRandom(companies, numCompanies) : [pickRandom(companies, numCompanies)],
        specialty: pickRandom(specialties),
        score: avgScore || (Math.random() * 1.5 + 3.5).toFixed(1) * 1,
        reviews: nodeReviews,
        ...weightedGeoLocation(),
        social: {
          linkedin: `https://linkedin.com/in/${nodeName.replace(' ', '').toLowerCase()}`,
          whatsapp: Math.random() > 0.5 ? '551199999999' : null,
          twitter: Math.random() > 0.7 ? `https://twitter.com/${nodeName.split(' ')[0].toLowerCase()}` : null,
          instagram: Math.random() > 0.3 ? `https://instagram.com/${nodeName.replace(' ', '').toLowerCase()}` : null,
        }
      });

      links.push({ source: 'Me', target: id, value: Math.floor(Math.random() * 3) + 1 });

      if (i > 5 && Math.random() > 0.4) {
        links.push({ source: id, target: `Conn_${Math.floor(Math.random() * (i - 1)) + 1}`, value: 1 });
      }
    }

    personalWebCache = { nodes, links };
  }

  // ALWAYS return a deep copy to prevent the force engine from polluting the cache
  return JSON.parse(JSON.stringify(personalWebCache));
};

export const generateContextData = (contextParam) => {
  const { nodes: personalNodes, links: personalLinks } = getPersonalWeb();
  
  if (!contextParam) {
    return { nodes: personalNodes, links: personalLinks };
  }

  // Determine size of the external network based on context
  let strangerCount = 0;
  if (contextParam.includes('Web Summit')) strangerCount = 450;
  else if (contextParam.includes('Clube Imparável')) strangerCount = 173;
  else strangerCount = 120;

  const strangerNodes = [];
  const strangerLinks = [];

  // Generate strangers
  for (let i = 1; i <= strangerCount; i++) {
    const roleObj = roles[Math.floor(Math.random() * roles.length)];
    const id = `Stranger_${contextParam}_${i}`;
    
    strangerNodes.push({
      id,
      group: roleObj.group,
      val: Math.floor(Math.random() * 5) + 5,
      name: `Usuário Oculto`,
      role: 'Indisponível',
      isConnectedToMe: false,
      bio: 'Conecte-se para ver o perfil completo desta pessoa.',
      companies: [],
      specialty: null,
      score: 0,
      reviews: [],
      skills: [],
      social: {}
    });

    if (i > 1) {
      strangerLinks.push({ source: id, target: `Stranger_${contextParam}_${i-1}`, value: 1 });
      
      if (Math.random() > 0.8) {
        strangerLinks.push({ source: id, target: `Stranger_${contextParam}_${Math.floor(Math.random() * (i-1)) + 1}`, value: 1 });
      }
    }
  }

  const presenceRatio = contextParam.includes('Web Summit') ? 0.3 : 0.15;
  
  const attendingPersonalConnections = personalNodes.filter(n => {
    if (n.id === 'Me') return true;
    return Math.random() < presenceRatio;
  });

  const attendingPersonalIds = new Set(attendingPersonalConnections.map(n => n.id));

  const attendingPersonalLinks = personalLinks.filter(l => 
    attendingPersonalIds.has(l.source.id || l.source) && attendingPersonalIds.has(l.target.id || l.target)
  );
  
  attendingPersonalConnections.forEach(person => {
    if (person.id === 'Me') return;
    for (let i = 0; i < 3; i++) {
      const randomStranger = `Stranger_${contextParam}_${Math.floor(Math.random() * strangerCount) + 1}`;
      strangerLinks.push({ source: person.id, target: randomStranger, value: 1 });
    }
  });

  attendingPersonalConnections.forEach(person => {
     if(person.id !== 'Me' && Math.random() > 0.5) strangerLinks.push({ source: 'Me', target: person.id, value: 2 });
  });

  return {
    nodes: [...attendingPersonalConnections, ...strangerNodes],
    links: [...attendingPersonalLinks, ...strangerLinks]
  };
};

export const updateMeNode = (newData) => {
  if (personalWebCache) {
    const meIndex = personalWebCache.nodes.findIndex(n => n.id === 'Me');
    if (meIndex !== -1) {
      personalWebCache.nodes[meIndex] = { ...personalWebCache.nodes[meIndex], ...newData };
    }
  }
};

export const addReviewToNode = (nodeId, review) => {
  if (personalWebCache) {
    const nodeIndex = personalWebCache.nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex !== -1) {
      const node = personalWebCache.nodes[nodeIndex];
      node.reviews = node.reviews || [];
      node.reviews.push(review);
      // Recalculate score
      node.score = Math.round((node.reviews.reduce((sum, r) => sum + r.rating, 0) / node.reviews.length) * 10) / 10;
    }
  }
};

// Badge definitions
export const BADGES = {
  web_starter: { id: 'web_starter', emoji: '🕸️', name: 'Web Starter', desc: 'Primeira conexão feita' },
  dealmaker: { id: 'dealmaker', emoji: '🤝', name: 'Dealmaker', desc: 'Primeiro negócio fechado' },
  trusted: { id: 'trusted', emoji: '🌟', name: 'Trusted', desc: '5 reviews positivas' },
  community_builder: { id: 'community_builder', emoji: '🏛️', name: 'Community Builder', desc: 'Registrou uma comunidade' },
  scout: { id: 'scout', emoji: '🎯', name: 'Scout', desc: 'Convidou 10 pessoas' },
  profile_complete: { id: 'profile_complete', emoji: '✅', name: 'Perfil Completo', desc: 'Perfil 100% preenchido' },
  reviewer: { id: 'reviewer', emoji: '📝', name: 'Reviewer', desc: 'Avaliou 3 parcerias' },
};
