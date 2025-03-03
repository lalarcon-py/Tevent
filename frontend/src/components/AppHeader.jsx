// components/AppHeader.jsx
import { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  IconButton, 
  Typography, 
  useTheme, 
  useMediaQuery,
  Box,
  Menu,
  MenuItem
} from '@mui/material';
import {
  SupportAgent as SupportIcon,
  AccountCircle as AccountIcon,
  Receipt as BillingIcon,
  MoreVert as MoreIcon
} from '@mui/icons-material';
import TeventLogo from '../images/Tevent Logo.png';
import UserProfileMenu from './Header/UserProfileMenu';
import BillingMenu from './Header/BillingMenu';
import SupportForm from './Header/SupportForm';

const AppHeader = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Menu states
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);
  const [billingAnchorEl, setBillingAnchorEl] = useState(null);
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const [mobileMenuAnchorEl, setMobileMenuAnchorEl] = useState(null);
  
  // Menu handlers
  const handleProfileMenuOpen = (event) => {
    setProfileAnchorEl(event.currentTarget);
  };
  
  const handleProfileMenuClose = () => {
    setProfileAnchorEl(null);
  };
  
  const handleBillingMenuOpen = (event) => {
    setBillingAnchorEl(event.currentTarget);
  };
  
  const handleBillingMenuClose = () => {
    setBillingAnchorEl(null);
  };
  
  const handleSupportDialogOpen = () => {
    setSupportDialogOpen(true);
    handleMobileMenuClose();
  };
  
  const handleSupportDialogClose = () => {
    setSupportDialogOpen(false);
  };

  // Mobile menu handlers
  const handleMobileMenuOpen = (event) => {
    setMobileMenuAnchorEl(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchorEl(null);
  };

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
              height: isMobile ? '32px' : '40px',
              marginRight: '16px'
            }} 
          />
          <Typography 
            variant={isMobile ? "subtitle1" : "h6"} 
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
        
        {/* Desktop view */}
        {!isMobile && (
          <Box sx={{ display: 'flex' }}>
            <IconButton 
              color="inherit" 
              size="large" 
              onClick={handleSupportDialogOpen}
              sx={{
                transition: 'all 0.2s ease',
                '&:hover': { transform: 'scale(1.1)', color: '#90caf9' }
              }}
            >
              <SupportIcon sx={{ fontSize: 28 }} />
            </IconButton>
            
            <IconButton 
              color="inherit" 
              size="large"
              onClick={handleBillingMenuOpen}
              sx={{
                transition: 'all 0.2s ease',
                '&:hover': { transform: 'scale(1.1)', color: '#90caf9' }
              }}
            >
              <BillingIcon sx={{ fontSize: 28 }} />
            </IconButton>
            
            <IconButton 
              color="inherit" 
              size="large"
              onClick={handleProfileMenuOpen}
              sx={{
                transition: 'all 0.2s ease',
                '&:hover': { transform: 'scale(1.1)', color: '#90caf9' }
              }}
            >
              <AccountIcon sx={{ fontSize: 28 }} />
            </IconButton>
          </Box>
        )}
        
        {/* Mobile view - show more icon */}
        {isMobile && (
          <IconButton
            color="inherit"
            aria-label="more"
            aria-controls="mobile-menu"
            aria-haspopup="true"
            onClick={handleMobileMenuOpen}
          >
            <MoreIcon />
          </IconButton>
        )}
      </Toolbar>
      
      {/* Mobile menu */}
      <Menu
        id="mobile-menu"
        anchorEl={mobileMenuAnchorEl}
        keepMounted
        open={Boolean(mobileMenuAnchorEl)}
        onClose={handleMobileMenuClose}
      >
        <MenuItem onClick={() => {
          handleSupportDialogOpen();
          handleMobileMenuClose();
        }}>
          <IconButton color="inherit" size="small">
            <SupportIcon />
          </IconButton>
          <Typography>Support</Typography>
        </MenuItem>
        <MenuItem onClick={() => {
          handleBillingMenuOpen();
          handleMobileMenuClose();
        }}>
          <IconButton color="inherit" size="small">
            <BillingIcon />
          </IconButton>
          <Typography>Billing</Typography>
        </MenuItem>
        <MenuItem onClick={() => {
          handleProfileMenuOpen();
          handleMobileMenuClose();
        }}>
          <IconButton color="inherit" size="small">
            <AccountIcon />
          </IconButton>
          <Typography>Profile</Typography>
        </MenuItem>
      </Menu>
      
      {/* User Profile Menu */}
      <UserProfileMenu 
        anchorEl={profileAnchorEl}
        open={Boolean(profileAnchorEl)}
        handleClose={handleProfileMenuClose}
      />
      
      {/* Billing Menu */}
      <BillingMenu 
        anchorEl={billingAnchorEl}
        open={Boolean(billingAnchorEl)}
        handleClose={handleBillingMenuClose}
      />
      
      {/* Support Dialog */}
      <SupportForm 
        open={supportDialogOpen}
        handleClose={handleSupportDialogClose}
      />
    </AppBar>
  );
};

export default AppHeader;