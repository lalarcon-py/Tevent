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
  Button,
  IconButton,
  Typography,
  Tooltip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import axiosInstance from '../../config/axios.js';

const WaitListTab = () => {
  const [waitListItems, setWaitListItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWaitList();
  }, []);

  const fetchWaitList = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/waitlist');
      console.log('Waitlist response:', response.data); // Debug log
      
      // Validate the response data
      if (response.data && Array.isArray(response.data)) {
        setWaitListItems(response.data);
      } else {
        console.error('Invalid waitlist data format:', response.data);
        setWaitListItems([]);
      }
    } catch (error) {
      console.error('Failed to fetch wait list:', error);
      setWaitListItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRequest = async (id, status) => {
    try {
      await axiosInstance.put(`/api/waitlist/${id}`, { status });
      fetchWaitList();
    } catch (error) {
      console.error('Failed to update request:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return '#4caf50';
      case 'rejected':
        return '#f44336';
      default:
        return '#ffb74d';
    }
  };

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
        
        {loading ? (
          <Typography>Loading...</Typography>
        ) : !waitListItems || waitListItems.length === 0 ? (
          <Typography>No requests found</Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Player</TableCell>
                  <TableCell>DKP</TableCell>
                  <TableCell>Attendance</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {waitListItems.map((request) => (
                  request && (
                    <TableRow key={request.id} sx={{
                      '&:hover': {
                        backgroundColor: 'rgba(144, 202, 249, 0.1)'
                      }
                    }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar src={request.Item?.icon} sx={{ width: 40, height: 40 }}>
                            {(!request.Item?.icon && request.Item?.name) ? request.Item.name[0] : '?'}
                          </Avatar>
                          {request.Item?.name || 'Unknown Item'}
                        </Box>
                      </TableCell>
                      <TableCell>{request.Item?.type || 'Unknown'}</TableCell>
                      <TableCell>{request.Player?.name || 'Unknown Player'}</TableCell>
                      <TableCell>{request.Player?.dkp || 0}</TableCell>
                      <TableCell>{(request.Player?.attendanceRate || 0)}%</TableCell>
                      <TableCell>
                        <Typography sx={{ color: getStatusColor(request.status) }}>
                          {request.status ? (request.status.charAt(0).toUpperCase() + request.status.slice(1)) : 'Unknown'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {request.status === 'pending' && (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Approve">
                              <IconButton
                                onClick={() => handleUpdateRequest(request.id, 'approved')}
                                sx={{
                                  color: '#4caf50',
                                  '&:hover': {
                                    transform: 'scale(1.1)'
                                  }
                                }}
                              >
                                <CheckCircleIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject">
                              <IconButton
                                onClick={() => handleUpdateRequest(request.id, 'rejected')}
                                sx={{
                                  color: '#f44336',
                                  '&:hover': {
                                    transform: 'scale(1.1)'
                                  }
                                }}
                              >
                                <CancelIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default WaitListTab;