import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, X, Loader2 } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

const AIAssistant = ({ isOpen, onClose, nodesData, onAIResponse }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage = query.trim();
    setQuery('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        throw new Error("Chave da API do Gemini não configurada no .env");
      }

      const prompt = `
Você é o Connex AI, um assistente inteligente para um CRM pessoal. 
O usuário está fazendo uma pergunta sobre a sua rede de contatos.

Aqui está a lista de pessoas na rede dele (em formato JSON):
${JSON.stringify(nodesData.map(n => ({ id: n.id, name: n.name, area: n.group, bio: n.bio, skills: n.skills })))}

Analise esses perfis e responda à pergunta do usuário.
Você DEVE retornar a resposta ESTRITAMENTE no seguinte formato JSON (sem markdown, sem \`\`\`json):
{
  "answer": "Sua resposta amigável e conversacional em português explicando quem você encontrou e por quê.",
  "recommendedIds": ["id_da_pessoa1", "id_da_pessoa2"]
}

Pergunta do usuário: "${userMessage}"
      `;

      const result = await model.generateContent(prompt);
      const textResponse = result.response.text();
      
      // Limpar possível markdown do JSON retornado pela IA
      const cleanJsonStr = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const parsedData = JSON.parse(cleanJsonStr);

      setChatHistory(prev => [...prev, { role: 'ai', content: parsedData.answer }]);
      
      // Notify Dashboard to highlight these IDs
      if (parsedData.recommendedIds && parsedData.recommendedIds.length > 0) {
        onAIResponse(parsedData.recommendedIds);
      } else {
        onAIResponse(null); // Reset highlight
      }

    } catch (error) {
      console.error("Erro no Gemini:", error);
      setChatHistory(prev => [...prev, { role: 'ai', content: `Ops! Ocorreu um erro: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: '15vh', zIndex: 100
    }}>
      <div className="glass-panel" style={{
        width: '100%', maxWidth: '650px',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        animation: 'slideDown 0.2s ease-out',
        border: '1px solid rgba(99, 102, 241, 0.3)' // Indigo glow border
      }}>
        
        {/* Chat History Area */}
        {chatHistory.length > 0 && (
          <div style={{ padding: '1.5rem', maxHeight: '300px', overflowY: 'auto', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {chatHistory.map((msg, idx) => (
              <div key={idx} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: msg.role === 'user' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                  color: 'white',
                  fontSize: '0.95rem'
                }}>
                  {msg.role === 'ai' && <Sparkles size={14} style={{ display: 'inline', marginRight: '6px', color: 'var(--accent-color)' }} />}
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', padding: '1rem' }}>
          <Search size={24} style={{ color: 'var(--primary-color)', marginRight: '1rem' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: Quem aqui manja de React?"
            disabled={isLoading}
            style={{
              flex: 1, background: 'transparent', border: 'none', color: 'white',
              fontSize: '1.1rem', outline: 'none'
            }}
          />
          {isLoading ? (
            <Loader2 size={24} className="spin-animation" style={{ color: 'var(--text-secondary)' }} />
          ) : (
            <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={24} />
            </button>
          )}
        </form>
      </div>

      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .spin-animation {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AIAssistant;
