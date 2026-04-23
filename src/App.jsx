import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Profile from './pages/Profile'
import Explore from './pages/Explore'
import Wallet from './pages/Wallet'
import Events from './pages/Events'
import Communities from './pages/Communities'
import { ToastProvider } from './contexts/ToastContext'

function App() {
  return (
    <ToastProvider>
      <Router>
        <div className="app-container" style={{ paddingLeft: '80px' }}>
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/login" element={<Login />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/events" element={<Events />} />
              <Route path="/communities" element={<Communities />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ToastProvider>
  )
}

export default App
