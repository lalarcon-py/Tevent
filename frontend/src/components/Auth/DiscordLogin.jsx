// components/Auth/DiscordLogin.jsx
import { useState, useEffect } from 'react';
import { Button, Dialog, DialogTitle, DialogContent, TextField, Select, MenuItem, Box } from '@mui/material';

const DISCORD_CLIENT_ID = 'your_discord_client_id';
const REDIRECT_URI = 'your_redirect_uri';

const DiscordLogin = ({ onMemberAdd }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    role: 'Member',
    primary: '',
    secondary: '',
    spec: 'DPS'
  });
  
  const handleDiscordLogin = () => {
    window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=identify`;
  };

  const handleRegistration = () => {
    onMemberAdd({
      ...newMember,
      id: Date.now(),
      status: 'Active',
      builds: [{
        primary: newMember.primary,
        secondary: newMember.secondary,
        spec: newMember.spec
      }]
    });
    setIsOpen(false);
  };

  return (
    <>
      <Button variant="contained" onClick={handleDiscordLogin}>
        Login with Discord
      </Button>

      <Dialog open={isOpen} onClose={() => setIsOpen(false)}>
        <DialogTitle>Complete Registration</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 300 }}>
            <TextField
              label="In-Game Name"
              value={newMember.name}
              onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
            />
            <Select
              value={newMember.role}
              onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
              label="Guild Rank"
            >
              <MenuItem value="Member">Member</MenuItem>
              <MenuItem value="Officer">Officer</MenuItem>
            </Select>
            <TextField
              label="Main Weapon"
              value={newMember.primary}
              onChange={(e) => setNewMember({ ...newMember, primary: e.target.value })}
            />
            <TextField
              label="Secondary Weapon"
              value={newMember.secondary}
              onChange={(e) => setNewMember({ ...newMember, secondary: e.target.value })}
            />
            <Select
              value={newMember.spec}
              onChange={(e) => setNewMember({ ...newMember, spec: e.target.value })}
              label="Combat Role"
            >
              <MenuItem value="DPS">DPS</MenuItem>
              <MenuItem value="Tank">Tank</MenuItem>
              <MenuItem value="Healer">Healer</MenuItem>
            </Select>
            <Button variant="contained" onClick={handleRegistration}>
              Register
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DiscordLogin;