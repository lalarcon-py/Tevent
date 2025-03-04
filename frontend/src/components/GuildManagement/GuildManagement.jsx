// components/GuildManagement/GuildManagement.jsx
import { useState, useEffect } from 'react';
import { Box, TextField, CircularProgress } from '@mui/material';
import MembersList from './MembersList';
import InviteLinkButton from '../InviteLinkButton';
import GearCheckButton from './GearCheckButton';
import LeaveGuildButton from './LeaveGuildButton';
import DiscordLogin from '../Auth/DiscordLogin';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

const GuildManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [members, setMembers] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [guildId, setGuildId] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/status`, {
          credentials: 'include'
        });
        if (response.ok) {
          const userData = await response.json();
          setIsAuthenticated(true);
          setCurrentUser(userData);
          

          const pathParts = window.location.pathname.split('/');
          const guildIdIndex = pathParts.indexOf('guilds') + 1;
          if (guildIdIndex > 0 && guildIdIndex < pathParts.length) {
            setGuildId(pathParts[guildIdIndex]);
          }
          
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
      // Get current guild ID from storage
      const guildId = localStorage.getItem('guildId');
      
      if (!guildId) {
        console.error('No guild ID found');
        setLoading(false);
        return;
      }
      
      console.log('Fetching members for guild:', guildId);
      
      // Use the guild-specific endpoint
      const response = await fetch(`${API_URL}/api/guilds/${guildId}/members`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to fetch members');
      }
      
      const data = await response.json();
      console.log('Members data received:', data);
      
      // Process member data to ensure builds are properly structured
      const processedData = data.map(member => ({
        ...member,
        builds: Array.isArray(member.builds) ? member.builds : 
                typeof member.builds === 'string' ? JSON.parse(member.builds) : []
      }));
      
      setMembers(processedData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch members:', error);
      setLoading(false);
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
              {guildId && <LeaveGuildButton guildId={guildId} currentUserRole={currentUser?.role} />}
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
              currentUser={user} // Pass the current user from auth context
            />
          </Box>
        </>
      )}
    </Box>
  );
};

export default GuildManagement;