// components/GuildManagement/GuildManagement.jsx
import { useState, useEffect } from 'react';
import { Box, TextField } from '@mui/material';
import MembersList from './MembersList';
import InviteLinkButton from '../InviteLinkButton';
import GearCheckButton from './GearCheckButton';
import DiscordLogin from '../Auth/DiscordLogin';

const API_URL = process.env.REACT_APP_API_URL;

const GuildManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [members, setMembers] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/status`, {
          credentials: 'include'
        });
        if (response.ok) {
          const userData = await response.json();
          setIsAuthenticated(true);
          setCurrentUser(userData);
          // Fetch members after authentication
          fetchMembers();
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/members`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        // Sort members to ensure Guild Master is first
        const sortedMembers = data.sort((a, b) => {
          if (a.role === 'Guild Master') return -1;
          if (b.role === 'Guild Master') return 1;
          return 0;
        });
        setMembers(sortedMembers);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  };

  return (
    <Box sx={{ p: 4, height: '100%' }}>
      {!isAuthenticated ? (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh' 
        }}>
          <DiscordLogin />
        </Box>
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
            <MembersList 
              searchTerm={searchTerm} 
              members={members} 
              setMembers={setMembers}
              currentUser={currentUser}
            />
          </Box>
        </>
      )}
    </Box>
  );
};

export default GuildManagement;