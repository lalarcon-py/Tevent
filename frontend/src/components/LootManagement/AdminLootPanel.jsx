import { useState, useEffect } from 'react';
import { 
 Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
 Paper, Typography, Button, TextField, Checkbox, IconButton, Chip,
 Autocomplete, Avatar, ListItem, ListItemAvatar, ListItemText 
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useLoot } from '../../contexts/LootContext';
import axiosInstance from '../../config/axios.js';

const AdminLootPanel = () => {
 const [addedItems, setAddedItems] = useState([]);
 const [templateItems, setTemplateItems] = useState([]);
 const [loading, setLoading] = useState(false);
 const [newItem, setNewItem] = useState({
   name: '',
   type: '',
   dkpCost: 0,
   quantity: 1,
   inStorage: true,
   icon: ''
 });

 useEffect(() => {
   fetchAddedItems();
   fetchTemplateItems();
 }, []);

 const fetchAddedItems = async () => {
   try {
     const response = await axiosInstance.get('/api/items');
     setAddedItems(response.data.filter(item => item.quantity > 0 || item.inStorage));
   } catch (error) {
     console.error('Failed to fetch added items:', error);
   }
 };

 const fetchTemplateItems = async () => {
   try {
     setLoading(true);
     const response = await axiosInstance.get('/api/items/autocomplete');
     setTemplateItems(response.data);
   } catch (error) {
     console.error('Failed to fetch template items:', error);
   } finally {
     setLoading(false);
   }
 };

 const handleUpdate = async (id, field, value) => {
   try {
     const response = await axiosInstance.put(`/api/items/${id}`, { [field]: value });
     if (response.status === 200) fetchAddedItems();
   } catch (error) {
     console.error('Update error:', error);
   }
 };

 const handleDelete = async (id) => {
   try {
     await axiosInstance.delete(`/api/items/${id}`);
     fetchAddedItems();
   } catch (error) {
     console.error('Delete failed:', error);
   }
 };

 const handleAddItem = async () => {
   try {
     if (!newItem.name) return;

     const response = await axiosInstance.post('/api/items', {
       ...newItem,
       inStorage: true
     });
     
     if (response.status === 201) {
       setAddedItems(prev => [...prev, response.data]);
       
       setNewItem({
         name: '',
         type: '',
         dkpCost: 0,
         quantity: 1,
         inStorage: true,
         icon: ''
       });
     }
   } catch (error) {
     console.error('Create error:', error);
   }
 };

 return (
   <Box>
     <Paper sx={{ 
       p: 4, 
       mb: 4,
       background: 'rgba(30, 30, 30, 0.6)',
       backdropFilter: 'blur(12px)',
       transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
       '&:hover': {
         transform: 'translateY(-5px)',
         boxShadow: '0 8px 32px rgba(144, 202, 249, 0.2)'
       }
     }}>
       <Typography variant="h6" gutterBottom sx={{ color: '#90caf9' }}>Add New Item</Typography>
       <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
         <Autocomplete
           freeSolo
           options={templateItems}
           getOptionLabel={(option) => typeof option === 'string' ? option : option?.name || ''}
           value={newItem}
           onChange={(_, newValue) => {
             if (newValue) {
               setNewItem({
                 ...newItem,
                 name: newValue.name || '',
                 type: newValue.type || '',
                 icon: newValue.icon || '',
                 dkpCost: newValue.dkpCost || 0
               });
             }
           }}
           renderInput={(params) => (
             <TextField
               {...params}
               label="Item Name"
               sx={{
                 minWidth: 300,
                 '& .MuiOutlinedInput-root': {
                   background: 'rgba(30, 30, 30, 0.4)',
                   backdropFilter: 'blur(12px)'
                 }
               }}
             />
           )}
           renderOption={(props, option) => (
             <ListItem {...props}>
               <ListItemAvatar>
                 <Avatar
                   src={option.icon}
                   sx={{
                     width: 40,
                     height: 40,
                     bgcolor: 'rgba(144, 202, 249, 0.1)',
                     border: '1px solid rgba(144, 202, 249, 0.2)'
                   }}
                 >
                   {!option.icon && option.name?.[0]}
                 </Avatar>
               </ListItemAvatar>
               <ListItemText 
                 primary={option.name} 
                 secondary={option.type}
               />
             </ListItem>
           )}
         />
         <TextField
           label="DKP Cost"
           type="number"
           value={newItem.dkpCost}
           onChange={(e) => setNewItem({ ...newItem, dkpCost: Number(e.target.value) })}
           sx={{
             '& .MuiOutlinedInput-root': {
               background: 'rgba(30, 30, 30, 0.4)',
               backdropFilter: 'blur(12px)'
             }
           }}
         />
         <TextField
           label="Quantity"
           type="number"
           value={newItem.quantity}
           onChange={(e) => setNewItem({ ...newItem, quantity: Math.max(1, Number(e.target.value)) })}
           InputProps={{ inputProps: { min: 1 } }}
           sx={{
             '& .MuiOutlinedInput-root': {
               background: 'rgba(30, 30, 30, 0.4)',
               backdropFilter: 'blur(12px)'
             }
           }}
         />
         <Button 
           variant="contained" 
           onClick={handleAddItem}
           disabled={!newItem.name}
           sx={{
             background: 'linear-gradient(45deg, rgba(144, 202, 249, 0.6), rgba(144, 202, 249, 0.8))',
             backdropFilter: 'blur(12px)',
             transition: 'all 0.3s ease',
             '&:hover': {
               transform: 'translateY(-2px)',
               boxShadow: '0 5px 15px rgba(144, 202, 249, 0.4)'
             }
           }}
         >
           Add Item
         </Button>
       </Box>
     </Paper>

     <TableContainer component={Paper} sx={{
       background: 'rgba(30, 30, 30, 0.6)',
       backdropFilter: 'blur(12px)'
     }}>
       <Table>
         <TableHead>
           <TableRow>
             <TableCell>Item</TableCell>
             <TableCell>Type</TableCell>
             <TableCell>DKP Cost</TableCell>
             <TableCell>In Storage</TableCell>
             <TableCell>Quantity</TableCell>
             <TableCell>Actions</TableCell>
           </TableRow>
         </TableHead>
         <TableBody>
           {addedItems.map((item) => (
             <TableRow key={item.id} sx={{
               '&:hover': {
                 backgroundColor: 'rgba(144, 202, 249, 0.1)'
               }
             }}>
               <TableCell>
                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                   <Avatar src={item.icon} sx={{ width: 40, height: 40 }}>
                     {!item.icon && item.name[0]}
                   </Avatar>
                   {item.name}
                 </Box>
               </TableCell>
               <TableCell>{item.type}</TableCell>
               <TableCell>
                 <TextField
                   type="number"
                   value={item.dkpCost}
                   onChange={(e) => handleUpdate(item.id, 'dkpCost', Number(e.target.value))}
                   sx={{ '& .MuiOutlinedInput-root': { background: 'rgba(30, 30, 30, 0.4)' } }}
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
                   onChange={(e) => handleUpdate(item.id, 'quantity', Number(e.target.value))}
                   sx={{ '& .MuiOutlinedInput-root': { background: 'rgba(30, 30, 30, 0.4)' } }}
                 />
               </TableCell>
               <TableCell>
                 <IconButton 
                   onClick={() => handleDelete(item.id)}
                   sx={{ 
                     '&:hover': { 
                       color: '#ff4444',
                       transform: 'scale(1.1)'
                     }
                   }}
                 >
                   <DeleteIcon />
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