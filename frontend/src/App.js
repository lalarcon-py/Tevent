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
                mt: { xs: '56px', sm: '64px' }
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