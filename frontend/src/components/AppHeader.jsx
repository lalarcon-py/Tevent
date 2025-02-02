import { 
  AppBar, 
  Toolbar, 
  IconButton, 
  Typography, 
  useTheme, 
  useMediaQuery,
  Box
} from '@mui/material';
import {
  SupportAgent as SupportIcon,
  AccountCircle as AccountIcon,
  Receipt as BillingIcon
} from '@mui/icons-material';
import TeventLogo from '../images/Tevent Logo.png';


const AppHeader = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
      <AppBar 
          position="fixed"
          sx={{
              width: '100%',
              zIndex: theme.zIndex.drawer + 1,
              bgcolor: '#1a1a1a',
              boxShadow: 'none',
              borderBottom: '1px solid rgba(255, 255, 255, 0.12)'
          }}
      >
          <Toolbar sx={{ justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                  <img 
                      src={TeventLogo} 
                      alt="Tevent Logo" 
                      style={{ 
                          height: '40px',
                          marginRight: '16px'
                      }} 
                  />
                  <Typography 
                      variant="h6" 
                      component="div" 
                      sx={{ 
                          fontFamily: 'Arial',
                          letterSpacing: '1.5px',
                          textAlign: 'center',
                          flexGrow: 1
                      }}
                  >
                      TEVENT
                  </Typography>
              </Box>
              
              <Box sx={{ display: 'flex' }}>
                  <IconButton color="inherit" size="large">
                      <SupportIcon sx={{ fontSize: 28 }} />
                  </IconButton>
                  
                  <IconButton color="inherit" size="large">
                      <BillingIcon sx={{ fontSize: 28 }} />
                  </IconButton>
                  
                  <IconButton color="inherit" size="large">
                      <AccountIcon sx={{ fontSize: 28 }} />
                  </IconButton>
              </Box>
          </Toolbar>
      </AppBar>
  );
};

export default AppHeader;