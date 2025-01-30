// frontend/src/components/Common/LoadingSpinner.jsx
import { CircularProgress } from '@mui/material';

const LoadingSpinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
    <CircularProgress sx={{ color: '#90caf9' }} />
  </div>
);