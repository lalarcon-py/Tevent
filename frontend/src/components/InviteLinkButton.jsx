import { Button, Dialog, DialogContent, Typography } from '@mui/material';
import { useState } from 'react';

const InviteLinkButton = () => {
  const [open, setOpen] = useState(false);
  const [inviteLink] = useState(`${window.location.origin}/join?code=${Math.random().toString(36).substr(2, 8)}`);

  return (
    <>
      <Button 
        variant="contained" 
        onClick={() => setOpen(true)}
        sx={{
          bgcolor: '#90caf9',
          color: '#1a1a1a',
          fontWeight: 'bold',
          px: 4,
          py: 1.5,
          borderRadius: '8px',
          '&:hover': {
            bgcolor: '#64b5f6',
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 15px rgba(144, 202, 249, 0.4)'
          },
          transition: 'all 0.3s ease'
        }}
      >
        Invite Guild Member
      </Button>
      <Dialog 
        open={open} 
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            background: 'linear-gradient(145deg, #1e1e1e 0%, #2a2a2a 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)'
          }
        }}
      >
        <DialogContent sx={{ py: 4, px: 6 }}>
          <Typography variant="h6" sx={{ color: '#90caf9', mb: 2 }}>
            Share this invite link:
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: 'white', 
              bgcolor: '#1a1a1a', 
              p: 2, 
              borderRadius: '8px',
              wordBreak: 'break-all',
              fontFamily: 'monospace'
            }}
          >
            {inviteLink}
          </Typography>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InviteLinkButton;