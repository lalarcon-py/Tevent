// components/Auth/AuthOverlay.jsx
import { Box, Paper, Typography } from '@mui/material';
import DiscordLogin from './DiscordLogin';

const AuthOverlay = () => {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
      }}
    >
      <Paper
        elevation={24}
        sx={{
          p: 4,
          maxWidth: 400,
          width: '90%',
          background: 'rgba(30, 30, 30, 0.9)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          textAlign: 'center',
          animation: 'fadeIn 0.3s ease-out',
          '@keyframes fadeIn': {
            from: { opacity: 0, transform: 'translateY(-20px)' },
            to: { opacity: 1, transform: 'translateY(0)' }
          }
        }}
      >
        <Typography variant="h5" sx={{ mb: 3, color: '#90caf9' }}>
          Welcome to Tevent Guild Manager
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 4, color: 'rgba(255, 255, 255, 0.7)' }}>
          To access this page, please sign in with your Discord account.
        </Typography>

        <DiscordLogin />
      </Paper>
    </Box>
  );
};

export default AuthOverlay;