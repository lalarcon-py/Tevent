import { useState } from 'react';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, IconButton, Dialog, DialogTitle, DialogContent, Select, MenuItem, Button 
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

const mockMembers = [
    {
      id: 1,
      name: 'Player1',
      role: 'Guild Master',
      status: 'Active',
      builds: [
        { primary: 'Greatsword', secondary: 'Crossbow', spec: 'DPS' },
        { primary: 'Sword and Shield', secondary: 'Wand', spec: 'Tank' },
      ],
    },
    {
      id: 2,
      name: 'Player2',
      role: 'Officer',
      status: 'Active',
      builds: [
        { primary: 'Staff', secondary: 'Dagger', spec: 'Healer' },
      ],
    },
  ];

const EditMemberDialog = ({ member, onClose, onSave }) => {
  const [editedMember, setEditedMember] = useState({ ...member });

  const handleSpecChange = (buildIndex, value) => {
    const updatedBuilds = [...editedMember.builds];
    updatedBuilds[buildIndex].spec = value;
    setEditedMember({ ...editedMember, builds: updatedBuilds });
  };

  return (
    <Dialog open={Boolean(member)} onClose={onClose}>
      <DialogTitle sx={{ bgcolor: '#1a1a1a', color: 'white' }}>Edit Member</DialogTitle>
      <DialogContent sx={{ bgcolor: '#1e1e1e' }}>
        {editedMember?.builds?.map((build, index) => (
          <div key={index} style={{ margin: '1rem 0' }}>
            <Select
              value={build.spec}
              onChange={(e) => handleSpecChange(index, e.target.value)}
              fullWidth
              sx={{ 
                bgcolor: '#2d2d2d',
                color: 'white',
                '& .MuiSelect-icon': { color: 'white' }
              }}
            >
              <MenuItem value="DPS">DPS</MenuItem>
              <MenuItem value="Tank">Tank</MenuItem>
              <MenuItem value="Healer">Healer</MenuItem>
            </Select>
          </div>
        ))}
        <Button 
          variant="contained" 
          onClick={() => onSave(editedMember)} 
          sx={{ 
            mt: 2,
            bgcolor: '#90caf9',
            '&:hover': { bgcolor: '#64b5f6' }
          }}
        >
          Save
        </Button>
      </DialogContent>
    </Dialog>
  );
};

const MembersList = ({ searchTerm }) => {
    const [members, setMembers] = useState(mockMembers);
    const [editMember, setEditMember] = useState(null);

    const filteredMembers = members.filter(member =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

  const handleSave = (updatedMember) => {
    setMembers(members.map(m => m.id === updatedMember.id ? updatedMember : m));
    setEditMember(null);
  };

  return (
    <>
      <TableContainer component={Paper} sx={{ bgcolor: '#1e1e1e' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#1a1a1a' }}>
              {['Name', 'Guild Role', 'Status', 'Weapons', 'Combat Role', 'Actions'].map((header, index) => (
                <TableCell 
                  key={index}
                  sx={{ 
                    color: 'white', 
                    fontWeight: 'bold',
                    borderBottom: '2px solid #90caf9'
                  }}
                >
                  {header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {members.map((member) => (
              <TableRow 
                key={member.id}
                sx={{ 
                  '&:hover': { 
                    bgcolor: 'rgba(144, 202, 249, 0.1)',
                    transform: 'scale(1.02)',
                  },
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
              >
                <TableCell sx={{ color: 'white' }}>{member.name}</TableCell>
                <TableCell sx={{ color: 'white' }}>{member.role}</TableCell>
                <TableCell sx={{ color: 'white' }}>{member.status}</TableCell>
                <TableCell sx={{ color: 'white' }}>
                  {member.builds.map((build, index) => (
                    <div key={index} style={{ margin: '0.5rem 0' }}>
                      🗡 {build.primary} + {build.secondary}
                    </div>
                  ))}
                </TableCell>
                <TableCell sx={{ color: 'white' }}>
                  {member.builds.map((build, index) => (
                    <div 
                      key={index} 
                      style={{ 
                        margin: '0.5rem 0',
                        color: build.spec === 'DPS' ? '#ff6666' : 
                               build.spec === 'Tank' ? '#66b3ff' : 
                               '#66ff66'
                      }}
                    >
                      ⚔ {build.spec}
                    </div>
                  ))}
                </TableCell>
                <TableCell>
                  <IconButton 
                    onClick={() => setEditMember(member)}
                    sx={{ 
                      color: '#90caf9',
                      '&:hover': { 
                        bgcolor: 'rgba(144, 202, 249, 0.2)',
                        transform: 'scale(1.1)'
                      }
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <EditMemberDialog 
        member={editMember} 
        onClose={() => setEditMember(null)} 
        onSave={handleSave}
      />
    </>
  );
};

export default MembersList;