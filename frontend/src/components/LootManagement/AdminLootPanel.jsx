import { useState, useEffect } from 'react';
import { 
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, Typography, Button, TextField, Checkbox, IconButton, Chip 
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useLoot } from '../../contexts/LootContext';

const AdminLootPanel = () => {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({
    name: '',
    type: '',
    dkpCost: 0,
    quantity: 0,
    inStorage: false,
    icon: ''
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/items');
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error('Failed to fetch items:', error);
    }
  };

  const handleUpdate = async (id, field, value) => {
    try {
      const response = await fetch(`/api/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      
      if (!response.ok) throw new Error('Update failed');
      fetchItems(); // Refresh list
    } catch (error) {
      console.error('Update error:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`/api/items/${id}`, { method: 'DELETE' });
      fetchItems();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleAddItem = async () => {
    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      
      if (!response.ok) throw new Error('Creation failed');
      setNewItem({ name: '', type: '', dkpCost: 0, quantity: 0, inStorage: false, icon: '' });
      fetchItems();
    } catch (error) {
      console.error('Create error:', error);
    }
  };

  return (
    <Box>
      {/* Add New Item Form */}
      <Paper sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Add New Item</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Name"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
          />
          <TextField
            label="Type"
            value={newItem.type}
            onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
          />
          <TextField
            label="DKP Cost"
            type="number"
            value={newItem.dkpCost}
            onChange={(e) => setNewItem({ ...newItem, dkpCost: e.target.value })}
          />
          <Button variant="contained" onClick={handleAddItem}>
            Add Item
          </Button>
        </Box>
      </Paper>

      {/* Items Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>DKP Cost</TableCell>
              <TableCell>In Storage</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.type}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={item.dkpCost}
                    onChange={(e) => handleUpdate(item.id, 'dkpCost', e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Checkbox
                    checked={item.inStorage}
                    onChange={(e) => handleUpdate(item.id, 'inStorage', e.target.checked)}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleUpdate(item.id, 'quantity', e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleDelete(item.id)}>
                    <DeleteIcon sx={{ color: '#f44336' }} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AdminLootPanel;