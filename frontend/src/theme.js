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
      default: '#1a1a1a',
      paper: 'rgba(30, 30, 30, 0.8)',
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
          cursor: 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          margin: 0,
          padding: 0,
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(144, 202, 249, 0.15), transparent 25%)',
            pointerEvents: 'none',
            zIndex: 0,
          },
        },
        html: {
          overflow: 'hidden',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(30, 30, 30, 0.6)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px 0 rgba(0,0,0,0.5)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)',
          backgroundImage: 'none',
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: 'rgba(30, 30, 30, 0.8)',
            transform: 'translateY(-2px)',
            boxShadow: '0 12px 40px 0 rgba(0,0,0,0.6)',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(12px)',
          backgroundColor: 'rgba(30, 30, 30, 0.4)',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255,255,255,0.2)',
            transition: 'all 0.3s ease',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#90caf9',
            borderWidth: '2px',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#90caf9',
            borderWidth: '2px',
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
          backdropFilter: 'blur(12px)',
          backgroundColor: 'rgba(144, 202, 249, 0.1)',
          '&:hover': {
            backgroundColor: 'rgba(144, 202, 249, 0.2)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          backdropFilter: 'blur(12px)',
          backgroundColor: 'rgba(30, 30, 30, 0.8)',
        },
        listbox: {
          padding: '8px',
          '& .MuiAutocomplete-option': {
            borderRadius: '8px',
            margin: '4px 0',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: 'rgba(144, 202, 249, 0.1)',
            },
            '&[aria-selected="true"]': {
              backgroundColor: 'rgba(144, 202, 249, 0.2)',
            },
          },
        },
      },
    },
  },
  shape: {
    borderRadius: 8,
  },
});

export default darkTheme;