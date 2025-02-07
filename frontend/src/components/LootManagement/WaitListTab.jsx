// components/LootManagement/WaitListTab.jsx
import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  Typography,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress
} from '@mui/material';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import axiosInstance from '../../config/axios.js';
import { useAuth } from '../../contexts/AuthContext';
import { useLoot } from '../../contexts/LootContext';

const WaitListTab = () => {
  const { requests, loadRequests } = useLoot();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    action: null
  });

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      if (isAuthenticated && mounted) {
        await loadRequests();
      }
      if (mounted) {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, loadRequests]);

  const handleApprove = async (request) => {
    setConfirmDialog({
      open: true,
      title: 'Approve Request',
      message: `Are you sure you want to approve ${request?.User?.username}'s request for ${request?.Item?.name}?`,
      action: async () => {
        try {
          await axiosInstance.put(`/api/loot/request/${request.id}/approve`);
          await loadRequests();
        } catch (error) {
          console.error('Failed to approve request:', error);
        }
      }
    });
  };

  const handleDeny = async (request) => {
    setConfirmDialog({
      open: true,
      title: 'Deny Request',
      message: `Are you sure you want to deny ${request?.User?.username}'s request for ${request?.Item?.name}?`,
      action: async () => {
        try {
          await axiosInstance.put(`/api/loot/request/${request.id}/deny`);
          await loadRequests();
        } catch (error) {
          console.error('Failed to deny request:', error);
        }
      }
    });
  };

  const handleDelete = async (request) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Request',
      message: `Are you sure you want to delete ${request?.User?.username}'s request for ${request?.Item?.name}?`,
      action: async () => {
        try {
          await axiosInstance.delete(`/api/loot/request/${request.id}`);
          await loadRequests();
        } catch (error) {
          console.error('Failed to delete request:', error);
        }
      }
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Paper sx={{
        p: 4,
        background: 'rgba(30, 30, 30, 0.6)',
        backdropFilter: 'blur(12px)'
      }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#90caf9' }}>
          Item Requests
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#1a1a1a' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', borderBottom: '2px solid #90caf9' }}>Item</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', borderBottom: '2px solid #90caf9' }}>Type</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', borderBottom: '2px solid #90caf9' }}>Player</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', borderBottom: '2px solid #90caf9' }}>DKP</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', borderBottom: '2px solid #90caf9' }}>Status</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', borderBottom: '2px solid #90caf9' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests?.map((request) => (
                <TableRow 
                  key={request?.id}
                  sx={{ 
                    '&:hover': { 
                      bgcolor: 'rgba(144, 202, 249, 0.1)',
                      transform: 'scale(1.02)',
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar 
                        src={request?.Item?.icon} 
                        sx={{ 
                          width: 40, 
                          height: 40,
                          border: '2px solid #90caf9'
                        }}
                      >
                        {!request?.Item?.icon && request?.Item?.name?.[0]}
                      </Avatar>
                      <Typography sx={{ color: 'white' }}>
                        {request?.Item?.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: 'white' }}>{request?.Item?.type}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar 
                        src={request?.User?.avatar_url} 
                        sx={{ 
                          width: 40, 
                          height: 40,
                          border: '2px solid #90caf9'
                        }}
                      >
                        {!request?.User?.avatar_url && request?.User?.username?.[0]}
                      </Avatar>
                      <Typography sx={{ color: 'white' }}>
                        {request?.User?.username || 'Unknown User'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: 'white' }}>{request?.priority || 0}</TableCell>
                  <TableCell>
                    <Typography sx={{ 
                      color: request?.status === 'Approved' ? '#4caf50' : 
                             request?.status === 'Denied' ? '#f44336' : '#ffb74d'
                    }}>
                      {request?.status || 'Pending'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {request?.status === 'Pending' && (
                        <>
                          <Tooltip title="Approve">
                            <IconButton
                              onClick={() => handleApprove(request)}
                              sx={{
                                color: '#4caf50',
                                '&:hover': { transform: 'scale(1.1)' }
                              }}
                            >
                              <CheckCircleIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Deny">
                            <IconButton
                              onClick={() => handleDeny(request)}
                              sx={{
                                color: '#f44336',
                                '&:hover': { transform: 'scale(1.1)' }
                              }}
                            >
                              <CancelIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip title="Delete">
                        <IconButton
                          onClick={() => handleDelete(request)}
                          sx={{
                            color: '#757575',
                            '&:hover': { 
                              color: '#f44336',
                              transform: 'scale(1.1)'
                            }
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
 
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>{confirmDialog.message}</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              confirmDialog.action?.();
              setConfirmDialog({ ...confirmDialog, open: false });
            }}
            color="primary"
            variant="contained"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WaitListTab;