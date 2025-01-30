import { useState } from 'react';
import { Box, TextField } from '@mui/material';
import MembersList from './MembersList';
import InviteLinkButton from '../InviteLinkButton';
import GearCheckButton from './GearCheckButton';

const GuildManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <Box sx={{ p: 4, height: '100%' }}>
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
        <MembersList searchTerm={searchTerm} />
      </Box>
    </Box>
  );
};

export default GuildManagement;