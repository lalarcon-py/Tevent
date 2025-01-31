import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import AppHeader from './components/AppHeader';
import Navigation from './components/Navigation/Navigation';
import GuildManagement from './components/GuildManagement/GuildManagement';
import LootManagement from './components/LootManagement/LootManagement';
import GearCheck from './components/GearCheck/GearCheck';
import Dashboard from './components/Dashboard'
import { GuildProvider } from './contexts/GuildContext';
import { LootProvider } from './contexts/LootContext';
import theme from './theme';

function App() {
  useEffect(() => {
    const handleMouseMove = (e) => {
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <GuildProvider>
        <LootProvider>
          <Router>
            <AppHeader />
            <Navigation />
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
                }
              }}
            >
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/guild-management" element={<GuildManagement />} />
                <Route path="/loot-management" element={<LootManagement />} />
                <Route path="/gear-check" element={<GearCheck />} />
              </Routes>
            </Box>
          </Router>
        </LootProvider>
      </GuildProvider>
    </ThemeProvider>
  );
}

export default App;