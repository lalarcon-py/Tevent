import React, { useState, useEffect } from 'react';
import {
 Autocomplete,
 TextField,
 Button,
 CircularProgress,
 Box,
 Typography,
 Avatar,
 ListItem,
 ListItemAvatar,
 ListItemText
} from '@mui/material';
import axiosInstance from '../../config/axios.js';

const LootRequestForm = () => {
 const [allItems, setAllItems] = useState([]);
 const [loading, setLoading] = useState(true);
 const [inputValue, setInputValue] = useState('');
 const [selectedItem, setSelectedItem] = useState(null);
 const [showNotFound, setShowNotFound] = useState(false);

 useEffect(() => {
   const fetchAllItems = async () => {
     try {
       setLoading(true);
       const response = await axiosInstance.get('/api/items/autocomplete');
       console.log('Fetched items:', response.data);
       setAllItems(response.data);
     } catch (error) {
       console.error('Failed to fetch items:', error);
       setAllItems([]);
     } finally {
       setLoading(false);
     }
   };
   fetchAllItems();
 }, []);

 const filterItems = (options, inputValue) => {
   const searchTerm = inputValue.trim().toLowerCase();
   if (!searchTerm) return options;

   const filtered = options.filter(option =>
     option.name.toLowerCase().includes(searchTerm)
   );
   return filtered;
 };

 const handleSubmit = () => {
   if (selectedItem) {
     console.log('Submitting request for:', selectedItem);
   }
 };

 return (
   <Box sx={{ width: '100%', maxWidth: 600, mb: 4 }}>
     <Autocomplete
       freeSolo={false}
       options={allItems}
       getOptionLabel={(option) => 
         typeof option === 'string' ? option : (option?.name || '')
       }
       inputValue={inputValue}
       onInputChange={(_, value, reason) => {
         setInputValue(value);

         const filtered = filterItems(allItems, value);
         setShowNotFound(filtered.length === 0 && value.length > 0);

         if (reason === 'input') {
           setSelectedItem(null);
         }
       }}
       onChange={(_, value) => setSelectedItem(value)}
       loading={loading}
       filterOptions={(options, { inputValue }) => filterItems(options, inputValue)}
       renderInput={(params) => (
         <TextField
           {...params}
           label="Search Throne and Liberty Items"
           variant="outlined"
           fullWidth
           InputProps={{
             ...params.InputProps,
             endAdornment: (
               <>
                 {loading ? <CircularProgress color="inherit" size={20} /> : null}
                 {params.InputProps.endAdornment}
               </>
             )
           }}
         />
       )}
       renderOption={(props, option) => (
         <ListItem component="li" {...props}>
           <ListItemAvatar>
             <Avatar
               src={option.icon}
               sx={{
                 width: 40,
                 height: 40,
                 bgcolor: 'rgba(255,255,255,0.1)'
               }}
             >
               {!option.icon && option.name[0]}
             </Avatar>
           </ListItemAvatar>
           <ListItemText
             primary={option.name}
             primaryTypographyProps={{
               sx: {
                 color: 'white',
                 marginLeft: 2
               }
             }}
           />
         </ListItem>
       )}
       sx={{
         '& .MuiAutocomplete-listbox': {
           backgroundColor: '#1a1a1a',
           border: '1px solid rgba(255,255,255,0.1)'
         }
       }}
     />
     {showNotFound && (
       <Box sx={{
         mt: 2,
         p: 2,
         bgcolor: 'rgba(255,0,0,0.1)',
         borderRadius: 1,
         border: '1px solid rgba(255,0,0,0.3)'
       }}>
         <Typography variant="body2" sx={{ color: '#ff6666' }}>
           Item not found in database. Please contact @Skrinkz on Discord
         </Typography>
       </Box>
     )}
     <Button
       variant="contained"
       onClick={handleSubmit}
       disabled={!selectedItem}
       sx={{
         mt: 2,
         bgcolor: '#90caf9',
         '&:hover': { bgcolor: '#64b5f6' },
         '&:disabled': { bgcolor: '#666666' }
       }}
     >
       Request Item
     </Button>
   </Box>
 );
};

export default LootRequestForm;