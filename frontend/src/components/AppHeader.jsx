import { 
    AppBar, 
    Toolbar, 
    IconButton, 
    Typography, 
    useTheme, 
    useMediaQuery 
  } from '@mui/material';
  import {
    SupportAgent as SupportIcon,
    AccountCircle as AccountIcon,
    Receipt as BillingIcon
  } from '@mui/icons-material';
  
  const AppHeader = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
    return (
      <AppBar 
        position="fixed"
        sx={{
          width: { sm: `calc(100% - 240px)` },
          ml: { sm: '240px' },
          zIndex: theme.zIndex.drawer + 1,
          bgcolor: '#1a1a1a',
          boxShadow: 'none',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)'
        }}
      >
        <Toolbar>
          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontFamily: 'Arial',
              letterSpacing: '1.5px'
            }}
          >
            THRONE & LIBERTY GUILD MANAGER
          </Typography>
          
          <IconButton color="inherit" size="large">
            <SupportIcon sx={{ fontSize: 28 }} />
          </IconButton>
          
          <IconButton color="inherit" size="large">
            <BillingIcon sx={{ fontSize: 28 }} />
          </IconButton>
          
          <IconButton color="inherit" size="large">
            <AccountIcon sx={{ fontSize: 28 }} />
          </IconButton>
        </Toolbar>
      </AppBar>
    );
  };
  
  export default AppHeader;