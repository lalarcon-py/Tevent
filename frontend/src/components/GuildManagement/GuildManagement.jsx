// components/GuildManagement/GuildManagement.jsx
import { useState, useEffect } from 'react';
import { Box, TextField } from '@mui/material';
import MembersList from './MembersList';
import InviteLinkButton from '../InviteLinkButton';
import GearCheckButton from './GearCheckButton';
import DiscordLogin from '../Auth/DiscordLogin';

const GuildManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [members, setMembers] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is already authenticated
    const token = localStorage.getItem('discord_token');
    if (token) {
      setIsAuthenticated(true);
    }

    // Handle Discord OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      handleDiscordCallback(code);
    }
  }, []);

  const handleDiscordCallback = async (code) => {
    try {
      // Exchange code for token (implement API call)
      // Save token and user info
      const isFirstUser = members.length === 0;
      if (isFirstUser) {
        // Set user as Guild Master
        setMembers([{
          id: Date.now(),
          name: 'Guild Master', // You'll want to get this from Discord
          role: 'Guild Master',
          status: 'Active',
          builds: []
        }]);
      }
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Discord authentication failed:', error);
    }
  };

  const handleMemberAdd = (newMember) => {
    setMembers(prev => {
      const guildMaster = prev.find(m => m.role === 'Guild Master');
      const otherMembers = prev.filter(m => m.role !== 'Guild Master');
      return [guildMaster, ...otherMembers, newMember];
    });
  };

  return (
    <Box sx={{ p: 4, height: '100%' }}>
      {!isAuthenticated ? (
        <DiscordLogin onMemberAdd={handleMemberAdd} />
      ) : (
        <>
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 4,
            gap: 2
          }}>
            <TextField
              fullWidth
              label="Search Members"
              variant="outlined"
              sx={{
                maxWidth: '400px',
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': { borderColor: '#ffffff33' },
                  '&:hover fieldset': { borderColor: '#90caf9' }
                },
                '& .MuiInputLabel-root': { color: '#ffffff99' }
              }}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <InviteLinkButton />
              <GearCheckButton />
            </Box>
          </Box>

          <Box sx={{ 
            height: 'calc(100vh - 160px)',
            overflowY: 'auto',
            '&::-webkit-scrollbar': { display: 'none' }
          }}>
            <MembersList searchTerm={searchTerm} members={members} setMembers={setMembers} />
          </Box>
        </>
      )}
    </Box>
  );
};

export default GuildManagement;