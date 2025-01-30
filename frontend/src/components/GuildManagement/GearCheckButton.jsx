import { Button } from '@mui/material';

const GearCheckButton = () => {
  return (
    <Button
      variant="contained"
      sx={{
        bgcolor: '#f48fb1',
        color: '#1a1a1a',
        fontWeight: 'bold',
        px: 4,
        py: 1.5,
        borderRadius: '8px',
        '&:hover': {
          bgcolor: '#ec407a',
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 15px rgba(244, 143, 177, 0.4)'
        },
        transition: 'all 0.3s ease'
      }}
    >
      Gear Check
    </Button>
  );
};

export default GearCheckButton;