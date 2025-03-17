import { Button, useMediaQuery, useTheme } from '@mui/material';

const GearCheckButton = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  return (
    <Button
      variant="contained"
      sx={{
        bgcolor: '#f48fb1',
        color: '#1a1a1a',
        fontWeight: 'bold',
        px: isMobile ? 2 : 4,
        py: isMobile ? 1 : 1.5,
        minHeight: '44px', // Minimum touch target size
        fontSize: isMobile ? '0.875rem' : 'inherit',
        whiteSpace: 'nowrap',
        borderRadius: '8px',
        '&:hover': {
          bgcolor: '#ec407a',
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 15px rgba(244, 143, 177, 0.4)'
        },
        transition: 'all 0.3s ease',
        width: isMobile ? '100%' : 'auto', // Full width on mobile
        maxWidth: isMobile ? '100%' : 'none'
      }}
    >
      Gear Check
    </Button>
  );
};

export default GearCheckButton;