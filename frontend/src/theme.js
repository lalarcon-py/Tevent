import { createTheme } from '@mui/material/styles';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
      contrastText: '#1a1a1a',
    },
    secondary: {
      main: '#f48fb1',
      contrastText: '#1a1a1a',
    },
    background: {
      default: 'linear-gradient(180deg, #1a1a1a 0%, #2d1a1a 100%)',
      paper: 'rgba(30, 30, 30, 0.9)',
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
    },
    text: {
        primary: '#ffffff',
        secondary: '#90caf9',
      },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: 'linear-gradient(180deg, #1a1a1a 0%, #2d1a1a 100%)',
          backgroundAttachment: 'fixed',
          minHeight: '100vh',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          margin: 0,
          padding: 0,
        },
        html: {
          overflow: 'hidden',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(30, 30, 30, 0.9)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px 0 rgba(0,0,0,0.5)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)',
          backgroundImage: 'none', // Remove default MUI paper gradient
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255,255,255,0.2)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#90caf9',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 'bold',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
    },
  },
  shape: {
    borderRadius: 8,
  },
});

export default darkTheme;