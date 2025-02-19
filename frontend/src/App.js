import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
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
import EventForm from './components/EventPlanner/EventForm';
import EventList from './components/EventPlanner/EventList';
import EventListView from './components/EventPlanner/EventPlanner';
import theme from './theme';
import WaitListTab from './components/LootManagement/WaitListTab';
import AttendanceManagement from './components/LootManagement/AttendanceManagement';
import TeamPlanner from './components/TeamPlanner/TeamPlanner';
import { TeamProvider } from './contexts/TeamContext';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { AuthProvider } from './contexts/AuthContext';



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
      <AuthProvider>
      <GuildProvider>
        <LootProvider>
          <AttendanceProvider>
            <TeamProvider>
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
                  <Route path="/event-planner" element={<EventPlanner />} />
                  <Route path="/event-planner/:eventId" element={<EventDetails />} />
                  <Route path="/events/:eventId/team-planner" element={<TeamPlanner />} />
                </Routes>
              </Box>
            </Router>
            </TeamProvider>
          </AttendanceProvider>
        </LootProvider>
      </GuildProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;