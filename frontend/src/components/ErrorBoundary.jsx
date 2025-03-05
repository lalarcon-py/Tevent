// src/components/ErrorBoundary.jsx
import React from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Component Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 2, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 1 }}>
          <Alert 
            severity="warning" 
            action={
              <Button color="inherit" size="small" onClick={() => window.location.reload()}>
                Reload
              </Button>
            }
          >
            This component failed to load properly. This is usually a temporary issue.
          </Alert>
          {this.props.fallback}
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;