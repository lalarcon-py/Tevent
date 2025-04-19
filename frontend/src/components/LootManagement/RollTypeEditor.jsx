// src/components/LootManagement/RollTypeEditor.jsx
import React, { useState } from 'react';
import { Box, Chip, Popover, Typography, MenuItem, Button, CircularProgress } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import axiosInstance from '../../config/axios';

const ROLL_TYPES = [
  { id: 'NEED_ITEM', label: 'Need Item', color: '#4caf50', bgColor: 'rgba(76, 175, 80, 0.2)' },
  { id: 'NEED_TRAIT', label: 'Need Trait', color: '#2196f3', bgColor: 'rgba(33, 150, 243, 0.2)' },
  { id: 'GREED', label: 'Greed', color: '#ff9800', bgColor: 'rgba(255, 152, 0, 0.2)' }
];

const RollTypeEditor = ({ userId, guildId, currentRollType, onRollTypeChanged, itemId, requestId }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRollType, setSelectedRollType] = useState(currentRollType || 'NEED_ITEM');

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setError(null);
  };

  const handleRollTypeSelect = async (rollType) => {
    if (rollType === selectedRollType) {
      handleClose();
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Updating roll type for user ${userId} to ${rollType}`);
      
      const response = await axiosInstance.put(`/api/guilds/${guildId}/rolls/${userId}`, {
        rollType,
        itemId,
        requestId
      });
      
      console.log('Roll type update response:', response.data);
      
      setSelectedRollType(rollType);
      
      if (onRollTypeChanged) {
        onRollTypeChanged(rollType, response.data);
      }
      
      handleClose();
    } catch (err) {
      console.error('Error updating roll type:', err);
      setError(err.response?.data?.error || 'Failed to update roll type');
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentRollTypeObj = () => {
    return ROLL_TYPES.find(roll => roll.id === selectedRollType) || ROLL_TYPES[0];
  };

  const currentRollTypeObj = getCurrentRollTypeObj();
  const open = Boolean(anchorEl);
  
  return (
    <Box>
      {/* Roll Type Display Chip */}
      <Chip 
        label={currentRollTypeObj.label}
        size="small"
        icon={<EditIcon fontSize="small" />}
        onClick={handleClick}
        sx={{ 
          bgcolor: currentRollTypeObj.bgColor,
          color: currentRollTypeObj.color,
          fontWeight: 'medium',
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': {
            opacity: 0.9,
            boxShadow: '0px 2px 4px rgba(0,0,0,0.2)'
          }
        }}
      />

      {/* Roll Type Selection Popover */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        PaperProps={{
          sx: {
            width: 200,
            bgcolor: '#1e1e1e',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0px 4px 15px rgba(0, 0, 0, 0.5)',
            p: 1
          }
        }}
      >
        <Typography variant="subtitle2" sx={{ p: 1, color: '#90caf9' }}>
          Change Roll Type
        </Typography>
        
        {ROLL_TYPES.map((rollType) => (
          <MenuItem 
            key={rollType.id}
            onClick={() => handleRollTypeSelect(rollType.id)}
            disabled={isLoading}
            selected={rollType.id === selectedRollType}
            sx={{
              color: rollType.color,
              bgcolor: rollType.id === selectedRollType ? rollType.bgColor : 'transparent',
              '&:hover': {
                bgcolor: `${rollType.bgColor} !important`
              },
              borderRadius: 1,
              my: 0.5
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <Box 
                sx={{ 
                  width: 10, 
                  height: 10, 
                  borderRadius: '50%', 
                  bgcolor: rollType.color,
                  mr: 1
                }} 
              />
              {rollType.label}
            </Box>
          </MenuItem>
        ))}
        
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
            <CircularProgress size={20} />
          </Box>
        )}
        
        {error && (
          <Typography variant="caption" sx={{ color: 'error.main', p: 1, display: 'block' }}>
            {error}
          </Typography>
        )}
      </Popover>
    </Box>
  );
};

export default RollTypeEditor;