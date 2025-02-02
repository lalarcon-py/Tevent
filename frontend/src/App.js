import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import AppHeader from './components/AppHeader';
import Navigation from './components/Navigation/Navigation';
import GuildManagement from './components/GuildManagement/GuildManagement';
import LootManagement from './components/LootManagement/LootManagement';
import GearReview from './components/GearCheck/GearReview';
import GearSubmission from './components/GearCheck/GearSubmission';
import Dashboard from './components/Dashboard';
import EventPlanner from './components/EventPlanner/EventPlanner';
import { GuildProvider } from './contexts/GuildContext';
import { LootProvider } from './contexts/LootContext';
import { AttendanceProvider } from './contexts/AttendanceContext';
import theme from './theme';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('Attempting to fetch auth status...');
        const response = await fetch('http://localhost:5000/api/auth/status', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        console.log('Response received:', response);
        
        if (response.ok) {
          const userData = await response.json();
          console.log('Full userData received:', userData);
          console.log('Role before setting:', userData.role);
          setIsAuthenticated(true);
          setUserRole(userData.role); // Add logging after this
          console.log('userRole state after setting:', userRole); // Note: This might show stale value due to state updates being async
        }
      } catch (error) {
        console.error('Error:', error);
        setIsAuthenticated(false);
        setUserRole(null);
      }
    };
    checkAuth();
  }, []);

  const ProtectedRoute = ({ allowedRoles, children }) => {
    useEffect(() => {
      console.log('ProtectedRoute userRole changed:', userRole);
    }, [userRole]);
  
    console.log('ProtectedRoute current values:', {
      isAuthenticated,
      userRole,
      allowedRoles,
      hasAccess: allowedRoles?.includes(userRole)
    });
  
    if (!isAuthenticated) {
      return <Navigate to="/" />;
    }
    if (allowedRoles && !allowedRoles.includes(userRole)) {
      console.log('Role check failed:', {
        currentRole: userRole,
        allowedRoles: allowedRoles,
        includes: allowedRoles.includes(userRole)
      });
      return <Navigate to="/unauthorized" />;
    }
    return children;
  };

  return (
    <ThemeProvider theme={theme}>
      <GuildProvider>
        <LootProvider>
          <AttendanceProvider>
            <Router>
              {!isAuthenticated && (
                <Box
                  sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backdropFilter: 'blur(5px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    textAlign: 'center',
                    color: 'white',
                  }}
                >
                  <Typography variant="h4" gutterBottom>
                    Please log in to continue...
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    href="http://localhost:5000/auth/discord"
                    sx={{
                      bgcolor: '#5865F2',
                      '&:hover': { bgcolor: '#4752C4' },
                      px: 4,
                      py: 1.5,
                      fontSize: '1rem',
                    }}
                  >
                    Login with Discord
                  </Button>
                </Box>
              )}

              <Box
                sx={{
                  flexGrow: 1,
                  p: 3,
                  ml: { sm: '240px' },
                  mt: { xs: '56px', sm: '64px' },
                  position: 'relative',
                  filter: isAuthenticated ? 'none' : 'blur(5px)',
                }}
              >
                {isAuthenticated && <AppHeader />}
                {isAuthenticated && <Navigation />}
                <Routes>
                  <Route path="/auth/discord" element={<Navigate to="/" />} />
                  <Route path="/auth/discord/callback" element={<Navigate to="/" />} />

                  <Route
                    path="/"
                    element={
                      <ProtectedRoute allowedRoles={['Guild Master', 'Advisor', 'Guardian']}>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/guild-management"
                    element={
                      <ProtectedRoute allowedRoles={['Guild Master', 'Advisor']}>
                        <GuildManagement />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/loot-management"
                    element={
                      <ProtectedRoute allowedRoles={['Guild Master', 'Advisor']}>
                        <LootManagement />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/submit-gear"
                    element={
                      <ProtectedRoute allowedRoles={['Guild Master', 'Advisor', 'Guardian', 'Member']}>
                        <GearSubmission />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/gear-review"
                    element={
                      <ProtectedRoute allowedRoles={['Guild Master', 'Advisor']}>
                        <GearReview />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/event-planner"
                    element={
                      <ProtectedRoute allowedRoles={['Guild Master', 'Advisor']}>
                        <EventPlanner />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/unauthorized"
                    element={
                      <Box sx={{ textAlign: 'center', mt: 10 }}>
                        <Typography variant="h4" color="error">
                          You are not authorized to view this page.
                        </Typography>
                      </Box>
                    }
                  />
                </Routes>
              </Box>
            </Router>
          </AttendanceProvider>
        </LootProvider>
      </GuildProvider>
    </ThemeProvider>
  );
}

export default App;