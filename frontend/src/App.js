// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import AppHeader from './components/AppHeader';
import Navigation from './components/Navigation/Navigation';
import GuildManagement from './components/GuildManagement/GuildManagement';
import LootManagement from './components/LootManagement/LootManagement';
import GearCheck from './components/GearCheck/GearCheck';
import Dashboard from './components/Dashboard';
import EventPlanner from './components/EventPlanner/EventPlanner';
import { GuildProvider } from './contexts/GuildContext';
import { LootProvider } from './contexts/LootContext';
import { AttendanceProvider } from './contexts/AttendanceContext';
import EventDetails from './components/EventPlanner/EventDetails';
import TeamPlanner from './components/TeamPlanner/TeamPlanner';
import { TeamProvider } from './contexts/TeamContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthError from './pages/AuthError';
import GuildSetupOverlay from './components/Guild/GuildSetupOverlay';
import theme from './theme';
import EventSummaries from './components/EventSummaries/EventSummaries';
import GuildSettings from './components/GuildSettings/GuildSettings';

const API_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:5000'
  : process.env.REACT_APP_API_URL;

// Main App content with authentication checking
function AppContent() {
  const { isAuthenticated, user, checkAuth } = useAuth();
  const [hasGuild, setHasGuild] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentGuildId, setCurrentGuildId] = useState(null);

  // Add effect for mouse tracking (visual effect)
  useEffect(() => {
    const handleMouseMove = (e) => {
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Add effect to ensure auth is checked periodically
  useEffect(() => {
    // Check auth immediately on mount
    checkAuth();
    
    // And set up interval for periodic checks
    const interval = setInterval(() => {
      checkAuth();
    }, 300000); // Check every 5 minutes
    
    return () => clearInterval(interval);
  }, [checkAuth]);

  // Safe localStorage access
  const safeGetLocalStorage = (key) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('localStorage access error:', error);
      return null;
    }
  };

  const safeSetLocalStorage = (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn('localStorage set error:', error);
      return false;
    }
  };

  // Check guild membership when auth state changes
  useEffect(() => {
    const checkGuildMembership = async () => {
      try {
        setLoading(true);
        
        if (!isAuthenticated) {
          console.log('Not authenticated, clearing guild state');
          setHasGuild(false);
          setCurrentGuildId(null);
          return;
        }
        
        console.log('Checking guild membership for authenticated user');
        
        // Check if user has guilds
        const guildsResponse = await fetch(`${API_URL}/api/guilds/my-guilds`, {
          credentials: 'include'
        });
        
        if (guildsResponse.ok) {
          const guildsData = await guildsResponse.json();
          console.log('Guild data received:', guildsData); // Debug log
          
          // If user has active guilds
          if (guildsData.length > 0) {
            setHasGuild(true);
            
            // Get guild ID from local storage or use first guild
            const storedGuildId = safeGetLocalStorage('guildId');
            const activeGuild = guildsData.find(g => g.status === 'ACTIVE');
            
            if (storedGuildId && guildsData.some(g => g.id === storedGuildId && g.status === 'ACTIVE')) {
              setCurrentGuildId(storedGuildId);
            } else if (activeGuild) {
              // If we have an active guild but no stored ID, use the first active guild
              setCurrentGuildId(activeGuild.id);
              safeSetLocalStorage('guildId', activeGuild.id);
            } else {
              // If no active guilds, clear storage
              try {
                localStorage.removeItem('guildId');
              } catch (e) {
                console.warn('Failed to remove from localStorage:', e);
              }
              setHasGuild(false);
            }
          } else {
            // No guilds at all
            setHasGuild(false);
            try {
              localStorage.removeItem('guildId');
            } catch (e) {
              console.warn('Failed to remove from localStorage:', e);
            }
          }
        } else {
          console.error('Failed to fetch guilds:', guildsResponse.status);
          setHasGuild(false);
          try {
            localStorage.removeItem('guildId');
          } catch (e) {
            console.warn('Failed to remove from localStorage:', e);
          }
        }
      } catch (error) {
        console.error('Guild check failed:', error);
        setHasGuild(false);
      } finally {
        setLoading(false);
      }
    };

    checkGuildMembership();
  }, [isAuthenticated, user]); // Add user as a dependency

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          bgcolor: '#121212'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      {/* Show overlay when not authenticated OR when authenticated but no guild */}
      {(!isAuthenticated || (isAuthenticated && !hasGuild)) && <GuildSetupOverlay />}
      
      <Router>
        <AppHeader />
        <Navigation guildId={currentGuildId} />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            ml: { sm: '240px' },
            mt: { xs: '56px', sm: '64px' },
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(144, 202, 249, 0.1), transparent 50%)',
              pointerEvents: 'none',
              zIndex: 0,
            },
            // If not authenticated, blur the content - and only check authentication now
            filter: !isAuthenticated ? 'blur(5px)' : 'none',
            pointerEvents: !isAuthenticated ? 'none' : 'auto'
          }}
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/guild-management" element={<GuildManagement />} />
            <Route path="/loot-management" element={<LootManagement />} />
            <Route path="/gear-check" element={<GearCheck />} />
            <Route path="/event-planner" element={<EventPlanner />} />
            <Route path="/event-planner/:eventId" element={<EventDetails />} />
            <Route path="/events/:eventId/team-planner" element={<TeamPlanner />} />
            <Route path="/event-summaries" element={<EventSummaries />} />
            <Route path="/guilds/:guildId/settings" element={<GuildSettings />} />
            <Route path="/auth-error" element={<AuthError />} />
            <Route path="/guilds/:guildId/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/guilds/setup" element={<Navigate to="/" replace />} />
          </Routes>
        </Box>
      </Router>
    </>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <GuildProvider>
          <LootProvider>
            <AttendanceProvider>
              <TeamProvider>
                <AppContent />
              </TeamProvider>
            </AttendanceProvider>
          </LootProvider>
        </GuildProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;