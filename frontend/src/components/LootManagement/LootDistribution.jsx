// frontend/src/components/LootManagement/LootDistribution.jsx
import { useState } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from '@mui/material';

const LootDistribution = ({ members }) => {
  const [lootHistory, setLootHistory] = useState([]);

  const handleDistribute = (item, member) => {
    setLootHistory([...lootHistory, {
      item,
      member: member.name,
      date: new Date().toLocaleDateString(),
      dkpCost: item.value
    }]);
  };

  return (
    <Paper sx={{ p: 2, mt: 4 }}>
      <h3>Loot Distribution History</h3>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>Member</TableCell>
              <TableCell>DKP Cost</TableCell>
              <TableCell>Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lootHistory.map((entry, index) => (
              <TableRow key={index}>
                <TableCell>{entry.item}</TableCell>
                <TableCell>{entry.member}</TableCell>
                <TableCell>{entry.dkpCost}</TableCell>
                <TableCell>{entry.date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};