import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const Login = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin + '/onboarding',
        },
      });

      if (error) throw error;
      setMessage('Verifique seu email para o link de acesso!');
    } catch (error) {
      setMessage(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ padding: '3rem', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Bem-vindo ao <span className="text-gradient">Connex</span></h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Entre na sua rede inteligente.</p>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input 
            type="email" 
            placeholder="Seu endereço de email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
          />
          <button 
            type="submit" 
            className="btn-primary" 
            style={{ marginTop: '1rem' }}
            disabled={loading}
          >
            {loading ? 'Enviando link...' : 'Entrar com Magic Link'}
          </button>
        </form>

        {message && (
          <p style={{ marginTop: '1.5rem', color: 'var(--accent-color)', fontSize: '0.9rem' }}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default Login;
