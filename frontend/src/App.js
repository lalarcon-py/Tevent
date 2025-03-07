// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, useMediaQuery, useTheme } from '@mui/material';
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
import theme from './theme';
import EventSummaries from './components/EventSummaries/EventSummaries';
import GuildSettings from './components/GuildSettings/GuildSettings';
import { GuildSettingsProvider } from './contexts/GuildSettingsContext';
import GuildApplications from './pages/GuildApplications';
import GuildSetupPage from './pages/GuildSetupPage';
import LandingPage from './pages/LandingPage';
import { BillingProvider, useBilling } from './contexts/BillingContext';
import BillingPage from './pages/BillingPage';
import InactiveGuildOverlay from './components/Billing/InactiveGuildOverlay';
  
const API_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:5000'
  : process.env.REACT_APP_API_URL;

// Main App content with authentication checking
function AppContent() {
  const { isAuthenticated, user, checkAuth } = useAuth();
  const [hasGuild, setHasGuild] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentGuildId, setCurrentGuildId] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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

  const InactiveGuildOverlayWrapper = () => {
    const { isGuildActive, subscriptionStatus, subscriptionData } = useBilling();
    const location = useLocation();
    
    // Don't show overlay on billing page or non-guild pages
    const excludedPaths = ['/billing', '/login', '/guilds/setup', '/applications', '/auth-error'];
    const shouldExclude = excludedPaths.some(path => location.pathname.includes(path));
    
    if (shouldExclude || isGuildActive()) {
      return null;
    }
    
    // Calculate days remaining until guild deletion
    let daysRemaining = 0;
    if (subscriptionData?.lastActiveDate) {
      const lastActiveDate = new Date(subscriptionData.lastActiveDate);
      const deletionDate = new Date(lastActiveDate);
      deletionDate.setDate(deletionDate.getDate() + 14);
      
      const now = new Date();
      daysRemaining = Math.max(0, Math.ceil((deletionDate - now) / (1000 * 60 * 60 * 24)));
    }
    
    return <InactiveGuildOverlay daysRemaining={daysRemaining} />;
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
          setLoading(false);
          return;
        }
        
        console.log('Checking guild membership for authenticated user');
        
        // Check if user has guilds
        const guildsResponse = await fetch(`${API_URL}/api/guilds/my-guilds`, {
          credentials: 'include'
        });
        
        if (guildsResponse.ok) {
          const guildsData = await guildsResponse.json();
          console.log('Guild data received:', guildsData);
          
          // If user has active guilds
          if (guildsData.length > 0) {
            setHasGuild(true);
            
            // Get guild ID from local storage or use first guild
            let storedGuildId = null;
            
            // Safely access localStorage
            try {
              storedGuildId = localStorage.getItem('guildId');
            } catch (e) {
              console.warn('Failed to access localStorage:', e);
            }
            
            const activeGuild = guildsData.find(g => g.status === 'ACTIVE');
            
            if (storedGuildId && guildsData.some(g => g.id === storedGuildId && g.status === 'ACTIVE')) {
              setCurrentGuildId(storedGuildId);
            } else if (activeGuild) {
              // If we have an active guild but no stored ID, use the first active guild
              setCurrentGuildId(activeGuild.id);
              
              // Safely set localStorage
              try {
                localStorage.setItem('guildId', activeGuild.id);
              } catch (e) {
                console.warn('Failed to store in localStorage:', e);
              }
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
  }, [isAuthenticated, user]);

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
  
  // If not authenticated or no guild, show landing page with separate routes
  if (!isAuthenticated || !hasGuild) {
    return (
      <Router>
        <AppHeader showNavItems={false} />
        <Routes>
          <Route path="/auth-error" element={<AuthError />} />
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </Router>
    );
  }

  // User is authenticated and has guild, show full app
  return (
    <Router>
      <AppHeader showNavItems={true} />
      <Navigation guildId={currentGuildId} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: isMobile ? 2 : 3,
          ml: isMobile ? 0 : '240px',
          mt: { xs: '56px', sm: '64px' },
          mb: isMobile ? '64px' : 0,
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(144, 202, 249, 0.05) 0%, transparent 100%)',
            pointerEvents: 'none',
            zIndex: 0,
          }
        }}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/guild-management" element={<GuildManagement />} />
          <Route path="/loot-management" element={<LootManagement />} />
          <Route path="/gear-check" element={<GearCheck />} />
          <Route path="/event-planner" element={<EventPlanner />} />
          <Route path="/event-planner/:eventId" element={<EventDetails />} />
          <Route path="/events/:eventId/team-planner" element={<TeamPlanner />} />
          <Route path="/event-summaries" element={<EventSummaries />} />
          <Route path="/applications" element={<GuildApplications />} />
          <Route path="/guilds/:guildId/settings" element={<GuildSettings />} />
          <Route path="/auth-error" element={<AuthError />} />
          <Route path="/guilds/:guildId/dashboard" element={<Navigate to="/dashboard" replace />} />
          <Route path="/gear-check" element={<GearCheck />} />
          <Route path="/billing" element={<BillingPage />} />
        </Routes>
      </Box>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <BillingProvider>
        <GuildProvider>
          <GuildSettingsProvider>
            <LootProvider>
              <AttendanceProvider>
                <TeamProvider>
                  <AppContent />
                </TeamProvider>
              </AttendanceProvider>
            </LootProvider>
          </GuildSettingsProvider>
        </GuildProvider>
        </BillingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;