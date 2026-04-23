import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Network, Calendar, Users, LogOut, User, Compass, Wallet } from 'lucide-react';
import XPBar from './XPBar';

const Navbar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // In the future: await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <nav className="glass-panel" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      width: '80px', 
      height: '100vh', 
      padding: '2rem 0',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRight: '1px solid var(--border-color)',
      borderRadius: '0',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 40
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
        {/* Logo Icon */}
        <div style={{ 
          width: '40px', height: '40px', 
          borderRadius: '50%', 
          background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 15px var(--primary-glow)',
          marginBottom: '1rem',
          fontWeight: 'bold', color: 'white'
        }}>
          CX
        </div>

        {/* Links */}
        <NavLink to="/" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'} title="Dashboard / Network">
          <Network size={24} />
        </NavLink>
        <NavLink to="/explore" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'} title="Encontrar Conexões">
          <Compass size={24} />
        </NavLink>
        <NavLink to="/events" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'} title="Eventos">
          <Calendar size={24} />
        </NavLink>
        <NavLink to="/communities" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'} title="Comunidades">
          <Users size={24} />
        </NavLink>
      </div>

      {/* XP & Level indicator */}
      <div style={{ width: '60px' }}>
        <XPBar compact={true} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
        <NavLink to="/wallet" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'} title="Minha Wallet">
          <Wallet size={24} />
        </NavLink>
        <NavLink to="/profile" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'} title="Meu Perfil">
          <User size={24} />
        </NavLink>
        <button onClick={handleLogout} className="nav-item" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }} title="Sair">
          <LogOut size={24} color="var(--text-secondary)" />
        </button>
      </div>

      <style>{`
        .nav-item {
          color: var(--text-secondary);
          transition: var(--transition);
          padding: 0.5rem;
          border-radius: var(--radius-sm);
        }
        .nav-item:hover {
          color: white;
          background: rgba(255, 255, 255, 0.1);
        }
        .nav-item.active {
          color: var(--primary-color);
          background: rgba(99, 102, 241, 0.15);
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
