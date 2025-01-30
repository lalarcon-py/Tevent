import { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Autocomplete, 
  CircularProgress,
  Typography 
} from '@mui/material';
import { useLoot } from '../../contexts/LootContext';

const LootRequestForm = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const { requestItem, items } = useLoot();

  useEffect(() => {
    const searchItems = async () => {
      setIsSearching(true);
      // Simulated API call - replace with actual API in your implementation
      const results = items.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSearchResults(results);
      setIsSearching(false);
    };

    if (searchTerm.length > 2) {
      searchItems();
    }
  }, [searchTerm]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const item = searchResults[0];
    if (item) {
      await requestItem(item.id);
      setSearchTerm('');
    }
  };

  return (
    <Box sx={{ 
      bgcolor: 'rgba(30, 30, 30, 0.7)',
      p: 4,
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
    }}>
      <Typography variant="h5" sx={{ color: '#f48fb1', mb: 2 }}>
        Request New Item
      </Typography>
      <form onSubmit={handleSubmit}>
        <Autocomplete
          freeSolo
          options={searchResults}
          getOptionLabel={(option) => option.name}
          loading={isSearching}
          onInputChange={(_, value) => setSearchTerm(value)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Search Throne and Liberty Items"
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': { borderColor: '#ffffff33' },
                  '&:hover fieldset': { borderColor: '#90caf9' }
                },
                '& .MuiInputLabel-root': { color: '#ffffff99' }
              }}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {isSearching ? <CircularProgress size={20} sx={{ color: '#90caf9' }} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                )
              }}
            />
          )}
        />
        <Button 
          type="submit" 
          variant="contained" 
          sx={{ 
            mt: 2,
            bgcolor: '#90caf9',
            '&:hover': { bgcolor: '#64b5f6' }
          }}
        >
          Submit Request
        </Button>
      </form>
    </Box>
  );
};


export default LootRequestForm;