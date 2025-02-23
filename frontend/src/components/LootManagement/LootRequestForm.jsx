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
 ListItemText,
 Paper
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

 const handleSubmit = async () => {
  if (selectedItem) {
    try {
      await axiosInstance.post('/api/waitlist', {
        storageItemId: selectedItem.id
      });
      console.log('Request submitted successfully');
    } catch (error) {
      console.error('Failed to submit request:', error);
      console.error('Error details:', error.response?.data);
    }
  }
};

 return (
   <Paper 
     elevation={3}
     sx={{
       p: 4,
       width: '100%',
       maxWidth: 600,
       mb: 4,
       background: 'rgba(30, 30, 30, 0.6)',
       backdropFilter: 'blur(12px)',
       border: '1px solid rgba(255,255,255,0.1)',
       transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
       '&:hover': {
         transform: 'translateY(-5px)',
         boxShadow: '0 8px 32px rgba(144, 202, 249, 0.2)'
       }
     }}
   >
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
           sx={{
             '& .MuiOutlinedInput-root': {
               background: 'rgba(30, 30, 30, 0.4)',
               backdropFilter: 'blur(12px)',
               transition: 'all 0.3s ease'
             },
             '& .MuiOutlinedInput-notchedOutline': {
               borderColor: 'rgba(144, 202, 249, 0.3)'
             },
             '&:hover .MuiOutlinedInput-notchedOutline': {
               borderColor: 'rgba(144, 202, 249, 0.5)'
             }
           }}
           InputProps={{
             ...params.InputProps,
             endAdornment: (
               <>
                 {loading ? <CircularProgress color="primary" size={20} /> : null}
                 {params.InputProps.endAdornment}
               </>
             )
           }}
         />
       )}
       renderOption={(props, option) => (
         <ListItem {...props} sx={{
           transition: 'background-color 0.3s ease',
           borderRadius: 1,
           my: 0.5,
           '&:hover': {
             backgroundColor: 'rgba(144, 202, 249, 0.1)'
           }
         }}>
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
         width: '100%',
         background: 'linear-gradient(45deg, rgba(144, 202, 249, 0.6), rgba(144, 202, 249, 0.8))',
         backdropFilter: 'blur(12px)',
         transition: 'all 0.3s ease',
         '&:hover': {
           transform: 'translateY(-2px)',
           boxShadow: '0 5px 15px rgba(144, 202, 249, 0.4)'
         },
         '&:disabled': {
           background: 'rgba(144, 202, 249, 0.1)',
           color: 'rgba(255, 255, 255, 0.3)'
         }
       }}
     >
       Request Item
     </Button>
   </Paper>
 );
};

export default LootRequestForm;