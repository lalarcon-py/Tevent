import { 
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead, 
    TableRow, 
    Paper,
    Typography 
  } from '@mui/material';
  import { useLoot } from '../../contexts/LootContext';
  
  const LootWaitlist = () => {
    const { requests } = useLoot();
  
    return (
      <Paper sx={{ 
        mt: 4,
        bgcolor: 'rgba(30, 30, 30, 0.7)',
        backdropFilter: 'blur(10px)'
      }}>
        <Typography variant="h5" sx={{ 
          color: '#f48fb1', 
          p: 2,
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          Item Waitlist
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: '#90caf9' }}>Item</TableCell>
                <TableCell sx={{ color: '#90caf9' }}>Rarity</TableCell>
                <TableCell sx={{ color: '#90caf9' }}>Your Position</TableCell>
                <TableCell sx={{ color: '#90caf9' }}>DKP Priority</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((request, index) => (
                <TableRow key={request.id}>
                  <TableCell sx={{ color: 'white' }}>{request.Item.name}</TableCell>
                  <TableCell sx={{ color: this.getRarityColor(request.Item.rarity) }}>
                    {request.Item.rarity}
                  </TableCell>
                  <TableCell sx={{ color: 'white' }}>#{index + 1}</TableCell>
                  <TableCell sx={{ color: 'white' }}>{request.priority} DKP</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  };
  
  export default LootWaitlist;