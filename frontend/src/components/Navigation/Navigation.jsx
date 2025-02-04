import { Link } from 'react-router-dom';
import { 
  Drawer, 
  List, 
  ListItem, 
  ListItemText, 
  useTheme,
  useMediaQuery 
} from '@mui/material';
import GuildHeader from './GuildHeader';

const Navigation = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { 
          width: 240,
          boxSizing: 'border-box',
          top: isMobile ? 56 : 64,
          height: isMobile ? 'calc(100% - 56px)' : 'calc(100% - 64px)',
          background: 'linear-gradient(180deg, #1a1a1a 0%, #2d1a1a 100%)',
          borderRight: 'none'
        },
      }}
    >
      <GuildHeader />
      <List sx={{ pt: 2 }}>
        <ListItem button component={Link} to="/" sx={{ '&:hover': { bgcolor: 'rgba(144, 202, 249, 0.1)' } }}>
          <ListItemText primary="Dashboard" sx={{ color: 'white' }} />
        </ListItem>
        <ListItem button component={Link} to="/guild-management" sx={{ '&:hover': { bgcolor: 'rgba(144, 202, 249, 0.1)' } }}>
          <ListItemText primary="Guild Management" sx={{ color: 'white' }} />
        </ListItem>
        <ListItem button component={Link} to="/loot-management" sx={{ '&:hover': { bgcolor: 'rgba(144, 202, 249, 0.1)' } }}>
          <ListItemText primary="Loot Management" sx={{ color: 'white' }} />
        </ListItem>
        <ListItem button component={Link} to="/gear-check" sx={{ '&:hover': { bgcolor: 'rgba(144, 202, 249, 0.1)' } }}>
          <ListItemText primary="Gear Check" sx={{ color: 'white' }} />
        </ListItem>
        <ListItem 
            button 
            component={Link} 
            to="/event-planner" 
            sx={{ '&:hover': { bgcolor: 'rgba(144, 202, 249, 0.1)' } }}
          >
            <ListItemText primary="Event Planner" sx={{ color: 'white' }} />
          </ListItem>
          <ListItem 
            button 
            component={Link} 
            to="/team-planner" 
            sx={{ '&:hover': { bgcolor: 'rgba(144, 202, 249, 0.1)' } }}
          >
            <ListItemText primary="Team Planner" sx={{ color: 'white' }} />
          </ListItem>
      </List>
    </Drawer>
  );
};

export default Navigation;