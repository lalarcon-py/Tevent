// frontend/src/pages/AdminPortal.jsx
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Container, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, CircularProgress, Alert, Tabs, Tab, Snackbar, IconButton,
  FormControl, InputLabel, Select, MenuItem, Grid, Chip, ThemeProvider, createTheme
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import HistoryIcon from '@mui/icons-material/History';
import StorageIcon from '@mui/icons-material/Storage';
import InventoryIcon from '@mui/icons-material/Inventory';
import AddIcon from '@mui/icons-material/Add';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { format } from 'date-fns';
import axiosInstance from '../config/axios';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Create a custom admin theme to avoid the gradient color issue
const adminTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#3b82f6',
    },
    error: {
      main: '#ef4444',
    },
    background: {
      default: '#0f172a',
      paper: '#1e293b',
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255,255,255,0.7)',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 'bold',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

const AdminPortal = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // General state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  
  // Guild state
  const [guilds, setGuilds] = useState([]);
  const [selectedGuild, setSelectedGuild] = useState(null);
  const [guildDetails, setGuildDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState({
    action: 'extend',
    newExpiryDate: '',
    planId: 'monthly'
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  // Users state
  const [users, setUsers] = useState([]);
  const [userDetails, setUserDetails] = useState(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  
  // Logs state
  const [logs, setLogs] = useState([]);
  
  // Storage state
  const [guildStorage, setGuildStorage] = useState([]);
  const [lootRequests, setLootRequests] = useState([]);
  const [wishlists, setWishlists] = useState([]);
  const [storageLoading, setStorageLoading] = useState(false);
  const [storageTab, setStorageTab] = useState(0);
  const [itemDialog, setItemDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemFormData, setItemFormData] = useState({
    item_id: '',
    quantity: 1,
    trait: '',
    dkp_cost: 0
  });
  const [availableItems, setAvailableItems] = useState([]);
  const [editMode, setEditMode] = useState(false);

  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Check admin status with backend
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!isAuthenticated) {
        setAuthChecked(true);
        return;
      }
      
      try {
        await axiosInstance.get('/api/admin/test-admin');
        setIsAdmin(true);
        setAuthChecked(true);
      } catch (err) {
        console.error('Admin check failed:', err);
        setIsAdmin(false);
        setAuthChecked(true);
        
        // Only navigate away if this is a permission error (403)
        if (err.response && err.response.status === 403) {
          navigate('/dashboard');
        }
      }
    };
    
    checkAdminStatus();
  }, [isAuthenticated, navigate]);

  // Load data based on active tab
  useEffect(() => {
    const fetchGuilds = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axiosInstance.get('/api/admin/guilds');
        setGuilds(response.data);
      } catch (err) {
        console.error('Failed to fetch guilds:', err);
        setError('Failed to load guilds. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axiosInstance.get('/api/admin/users');
        setUsers(response.data);
      } catch (err) {
        console.error('Failed to fetch users:', err);
        setError('Failed to load users. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axiosInstance.get('/api/admin/logs');
        setLogs(response.data);
      } catch (err) {
        console.error('Failed to fetch logs:', err);
        setError('Failed to load logs. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    // Only fetch data if admin status has been confirmed
    if (isAuthenticated && isAdmin && authChecked) {
      if (tabValue === 0) {
        fetchGuilds();
      } else if (tabValue === 1) {
        fetchUsers();
      } else if (tabValue === 2) {
        fetchLogs();
      }
    }
  }, [isAuthenticated, isAdmin, authChecked, tabValue]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Guild Details Handlers
  const handleOpenGuildDetails = async (guild) => {
    setSelectedGuild(guild);
    setOpenDialog(true);
    setDetailsLoading(true);
    
    try {
      // Fetch guild details
      const detailsResponse = await axiosInstance.get(`/api/admin/guilds/${guild.id}`);
      setGuildDetails(detailsResponse.data);
      
      // Fetch guild storage data
      await fetchGuildStorage(guild.id);
    } catch (err) {
      console.error('Failed to fetch guild details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSubscriptionChange = (e) => {
    setSubscriptionData({
      ...subscriptionData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubscriptionUpdate = async () => {
    try {
      const response = await axiosInstance.post(
        `/api/admin/guilds/${selectedGuild.id}/subscription`,
        subscriptionData
      );
      
      setSuccessMessage('Subscription updated successfully!');
      setOpenSnackbar(true);
      setOpenDialog(false);
      
      // Refresh guilds list
      const guildsResponse = await axiosInstance.get('/api/admin/guilds');
      setGuilds(guildsResponse.data);
    } catch (err) {
      console.error('Failed to update subscription:', err);
      setError('Failed to update subscription. Please try again.');
    }
  };

  const handleDeleteGuild = async () => {
    if (deleteConfirmText !== selectedGuild.name) {
      setError('Guild name doesn\'t match. Please try again.');
      return;
    }

    try {
      await axiosInstance.delete(`/api/admin/guilds/${selectedGuild.id}`);
      
      setSuccessMessage('Guild deleted successfully!');
      setOpenSnackbar(true);
      setDeleteDialogOpen(false);
      setOpenDialog(false);
      
      // Refresh guilds list
      const guildsResponse = await axiosInstance.get('/api/admin/guilds');
      setGuilds(guildsResponse.data);
    } catch (err) {
      console.error('Failed to delete guild:', err);
      setError('Failed to delete guild. Please try again.');
    }
  };

  // User Details Handler
  const handleViewUserDetails = async (userId) => {
    try {
      setDetailsLoading(true);
      const response = await axiosInstance.get(`/api/admin/users/${userId}`);
      setUserDetails(response.data);
      setUserDetailsOpen(true);
    } catch (err) {
      console.error('Failed to fetch user details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };
  
  // Storage Management Handlers
  const fetchGuildStorage = async (guildId) => {
    try {
      setStorageLoading(true);
      
      const storageResponse = await axiosInstance.get(`/api/admin/guilds/${guildId}/storage`);
      setGuildStorage(storageResponse.data);
      
      const requestsResponse = await axiosInstance.get(`/api/admin/guilds/${guildId}/loot-requests`);
      setLootRequests(requestsResponse.data);
      
      const wishlistsResponse = await axiosInstance.get(`/api/admin/guilds/${guildId}/wishlists`);
      setWishlists(wishlistsResponse.data);
      
      const itemsResponse = await axiosInstance.get(`/api/admin/items`);
      setAvailableItems(itemsResponse.data);
    } catch (err) {
      console.error('Failed to fetch guild storage data:', err);
      setError('Failed to load guild storage data');
    } finally {
      setStorageLoading(false);
    }
  };

  const handleItemDialogOpen = (item = null) => {
    if (item) {
      // Edit mode
      setEditMode(true);
      setSelectedItem(item);
      setItemFormData({
        item_id: item.item_id,
        quantity: item.quantity || 1,
        trait: item.trait || '',
        dkp_cost: item.dkp_cost || 0
      });
    } else {
      // Add mode
      setEditMode(false);
      setSelectedItem(null);
      setItemFormData({
        item_id: '',
        quantity: 1,
        trait: '',
        dkp_cost: 0
      });
    }
    setItemDialog(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setItemFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'dkp_cost' 
        ? parseInt(value) || 0 
        : value
    }));
  };

  const handleSaveItem = async () => {
    try {
      setStorageLoading(true);
      
      if (editMode) {
        // Update existing item
        await axiosInstance.put(
          `/api/admin/guilds/${selectedGuild.id}/storage/${selectedItem.id}`,
          itemFormData
        );
        setSuccessMessage('Item updated successfully!');
      } else {
        // Add new item
        await axiosInstance.post(
          `/api/admin/guilds/${selectedGuild.id}/storage`,
          itemFormData
        );
        setSuccessMessage('Item added successfully!');
      }
      
      setOpenSnackbar(true);
      setItemDialog(false);
      
      // Refresh storage data
      await fetchGuildStorage(selectedGuild.id);
    } catch (err) {
      console.error('Failed to save item:', err);
      setError('Failed to save item. Please try again.');
    } finally {
      setStorageLoading(false);
    }
  };

  const handleDeleteItem = (itemId) => {
    setItemToDelete(itemId);
    setDeleteItemDialogOpen(true);
  };
  
  const confirmDeleteItem = async () => {
    try {
      setStorageLoading(true);
      
      await axiosInstance.delete(`/api/admin/guilds/${selectedGuild.id}/storage/${itemToDelete}`);
      
      setSuccessMessage('Item deleted successfully!');
      setOpenSnackbar(true);
      setDeleteItemDialogOpen(false);
      
      // Refresh storage data
      await fetchGuildStorage(selectedGuild.id);
    } catch (err) {
      console.error('Failed to delete item:', err);
      setError('Failed to delete item. Please try again.');
    } finally {
      setStorageLoading(false);
    }
  };

  const handleApproveDenyRequest = async (requestId, status) => {
    try {
      setStorageLoading(true);
      
      await axiosInstance.put(`/api/admin/guilds/${selectedGuild.id}/loot-requests/${requestId}`, {
        status
      });
      
      setSuccessMessage(`Request ${status === 'Approved' ? 'approved' : 'denied'} successfully!`);
      setOpenSnackbar(true);
      
      // Refresh storage data
      await fetchGuildStorage(selectedGuild.id);
    } catch (err) {
      console.error('Failed to update request:', err);
      setError('Failed to update request. Please try again.');
    } finally {
      setStorageLoading(false);
    }
  };

  // Show loading while checking admin status
  if (!authChecked) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // If not authenticated or not admin, show unauthorized message
  if (isAuthenticated && !isAdmin) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">
          You do not have permission to access the admin portal.
        </Alert>
      </Container>
    );
  }

  return (
    <ThemeProvider theme={adminTheme}>
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Paper sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <SupervisorAccountIcon sx={{ fontSize: 36, mr: 2, color: '#3b82f6' }} />
            <Typography variant="h4" component="h1" fontWeight="bold">
              Admin Support Portal
            </Typography>
          </Box>
          <Typography variant="body1" color="text.secondary">
            Secure administration interface for managing guilds and user data.
          </Typography>
        </Paper>

        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{
            mb: 3,
            '& .MuiTab-root': { color: 'text.secondary' },
            '& .Mui-selected': { color: 'primary.main' },
            '& .MuiTabs-indicator': { bgcolor: 'primary.main' }
          }}
        >
          <Tab 
            label="Guilds" 
            icon={<StorageIcon />} 
            iconPosition="start"
          />
          <Tab 
            label="Users" 
            icon={<PersonIcon />} 
            iconPosition="start"
          />
          <Tab 
            label="Logs" 
            icon={<HistoryIcon />} 
            iconPosition="start"
          />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Guilds Tab */}
            {tabValue === 0 && (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Guild ID</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Owner</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Created</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Subscription</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {guilds.map((guild) => (
                      <TableRow key={guild.id}>
                        <TableCell sx={{ color: 'text.secondary' }}>
                          {guild.id.substring(0, 8)}...
                        </TableCell>
                        <TableCell sx={{ color: 'text.primary' }}>{guild.name}</TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>{guild.owner_id}</TableCell>
                        <TableCell>
                          <Chip 
                            label={guild.status} 
                            sx={{ 
                              bgcolor: guild.status === 'ACTIVE' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                              color: guild.status === 'ACTIVE' ? '#34d399' : '#ef4444'
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>
                          {guild.created_at && format(new Date(guild.created_at), 'MM/dd/yyyy')}
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>
                          {guild.Subscription ? (
                            <>
                              {guild.Subscription.plan_id} (Expires: {format(new Date(guild.Subscription.expiry_date), 'MM/dd/yyyy')})
                            </>
                          ) : 'None'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={() => handleOpenGuildDetails(guild)}
                            sx={{ mr: 1 }}
                          >
                            Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Users Tab */}
            {tabValue === 1 && (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>User ID</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Username</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Discord ID</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Guilds</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Created</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.length > 0 ? (
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell sx={{ color: 'text.secondary' }}>
                            {user.id?.substring(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {user.avatar_url && (
                                <Box
                                  component="img"
                                  src={user.avatar_url}
                                  alt={user.username}
                                  sx={{ width: 24, height: 24, borderRadius: '50%', mr: 1 }}
                                />
                              )}
                              <Typography sx={{ color: 'text.primary' }}>
                                {user.username}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ color: 'text.secondary' }}>{user.discord_id}</TableCell>
                          <TableCell sx={{ color: 'text.secondary' }}>{user.email || 'N/A'}</TableCell>
                          <TableCell>
                            {user.memberships && user.memberships.length > 0 ? (
                              <Box>
                                {user.memberships.map((membership, i) => (
                                  <Chip 
                                    key={i}
                                    label={`${membership.guildName} (${membership.role})`}
                                    size="small"
                                    sx={{ 
                                      mr: 0.5, 
                                      mb: 0.5,
                                      bgcolor: membership.guildStatus === 'ACTIVE' ? 
                                        'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                      color: membership.guildStatus === 'ACTIVE' ? '#34d399' : '#ef4444'
                                    }}
                                  />
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                No guilds
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ color: 'text.secondary' }}>
                            {user.created_at && format(new Date(user.created_at), 'MM/dd/yyyy')}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => handleViewUserDetails(user.id)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ textAlign: 'center', color: 'text.secondary' }}>
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Logs Tab */}
            {tabValue === 2 && (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Admin</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Action</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Target</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Details</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {logs.length > 0 ? (
                      logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell sx={{ color: 'text.secondary' }}>
                            {format(new Date(log.created_at), 'MM/dd/yyyy HH:mm:ss')}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {log.User?.avatar_url && (
                                <Box
                                  component="img"
                                  src={log.User.avatar_url}
                                  alt={log.User.username}
                                  sx={{ width: 24, height: 24, borderRadius: '50%', mr: 1 }}
                                />
                              )}
                              <Typography sx={{ color: 'text.primary' }}>
                                {log.User?.username || 'Unknown'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ color: 'text.primary' }}>
                            {log.action.replace(/_/g, ' ')}
                          </TableCell>
                          <TableCell sx={{ color: 'text.secondary' }}>
                            {log.target_type} {log.target_id ? `(${log.target_id.substring(0, 8)}...)` : ''}
                          </TableCell>
                          <TableCell sx={{ color: 'text.secondary' }}>
                            {log.details ? JSON.stringify(log.details) : ''}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} sx={{ textAlign: 'center', color: 'text.secondary' }}>
                          No logs found. Admin actions will be recorded here.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}

        {/* Guild Details Dialog */}
        <Dialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                Guild Details: {selectedGuild?.name}
              </Typography>
              <IconButton onClick={() => setOpenDialog(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          
          <DialogContent dividers>
            {detailsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>Guild Information</Typography>
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">ID</Typography>
                      <Typography variant="body1" sx={{ mb: 1 }}>{selectedGuild?.id}</Typography>
                      
                      <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                      <Chip 
                        label={selectedGuild?.status} 
                        sx={{ 
                          mb: 1,
                          bgcolor: selectedGuild?.status === 'ACTIVE' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: selectedGuild?.status === 'ACTIVE' ? '#34d399' : '#ef4444'
                        }}
                      />
                      
                      <Typography variant="subtitle2" color="text.secondary">Created At</Typography>
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        {selectedGuild?.created_at && format(new Date(selectedGuild.created_at), 'MM/dd/yyyy HH:mm:ss')}
                      </Typography>
                      
                      <Typography variant="subtitle2" color="text.secondary">Join Code</Typography>
                      <Typography variant="body1" sx={{ mb: 1 }}>{selectedGuild?.join_code}</Typography>
                    </Box>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>Subscription Management</Typography>
                    
                    <Box sx={{ mt: 2 }}>
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel id="subscription-action-label">
                          Action
                        </InputLabel>
                        <Select
                          labelId="subscription-action-label"
                          name="action"
                          value={subscriptionData.action}
                          onChange={handleSubscriptionChange}
                        >
                          <MenuItem value="extend">Extend Subscription</MenuItem>
                          <MenuItem value="cancel">Cancel Subscription</MenuItem>
                        </Select>
                      </FormControl>
                      
                      {subscriptionData.action === 'extend' && (
                        <>
                          <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel id="plan-id-label">
                              Plan
                            </InputLabel>
                            <Select
                              labelId="plan-id-label"
                              name="planId"
                              value={subscriptionData.planId}
                              onChange={handleSubscriptionChange}
                            >
                              <MenuItem value="monthly">Monthly</MenuItem>
                              <MenuItem value="biannual">Biannual</MenuItem>
                              <MenuItem value="annual">Annual</MenuItem>
                            </Select>
                          </FormControl>
                          
                          <TextField
                            label="New Expiry Date"
                            type="date"
                            name="newExpiryDate"
                            value={subscriptionData.newExpiryDate}
                            onChange={handleSubscriptionChange}
                            fullWidth
                            InputLabelProps={{
                              shrink: true
                            }}
                            sx={{ mb: 3 }}
                          />
                        </>
                      )}
                      
                      <Button
                        variant="contained"
                        onClick={handleSubscriptionUpdate}
                        fullWidth
                      >
                        Update Subscription
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
                
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                        <InventoryIcon sx={{ mr: 1 }} />
                        Guild Storage Management
                      </Typography>
                      
                      {storageTab === 0 && (
                        <Button 
                          variant="contained" 
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => handleItemDialogOpen()}
                        >
                          Add Item
                        </Button>
                      )}
                    </Box>
                    
                    <Tabs 
                      value={storageTab} 
                      onChange={(e, newValue) => setStorageTab(newValue)}
                      sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
                    >
                      <Tab icon={<InventoryIcon />} label="Storage Items" iconPosition="start" />
                      <Tab icon={<ShoppingCartIcon />} label="Loot Requests" iconPosition="start" />
                      <Tab icon={<FavoriteIcon />} label="Wishlists" iconPosition="start" />
                    </Tabs>
                    
                    {storageLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                        <CircularProgress />
                      </Box>
                    ) : (
                      <>
                        {/* Storage Items Tab */}
                        {storageTab === 0 && (
                          <TableContainer>
                            <Table>
                              <TableHead>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Item Name</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Quantity</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }}>DKP Cost</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Trait</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {guildStorage.length > 0 ? (
                                  guildStorage.map((item) => (
                                    <TableRow key={item.id}>
                                      <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                          {item.Item?.icon && (
                                            <Box
                                              component="img"
                                              src={item.Item.icon}
                                              alt={item.Item?.name}
                                              sx={{ width: 24, height: 24, mr: 1 }}
                                            />
                                          )}
                                          <Typography sx={{ color: 'text.primary' }}>
                                            {item.Item?.name || 'Unknown Item'}
                                          </Typography>
                                        </Box>
                                      </TableCell>
                                      <TableCell>{item.quantity || 0}</TableCell>
                                      <TableCell>{item.dkp_cost || 0}</TableCell>
                                      <TableCell>{item.trait || 'None'}</TableCell>
                                      <TableCell>
                                        <IconButton 
                                          size="small" 
                                          onClick={() => handleItemDialogOpen(item)}
                                          sx={{ mr: 1 }}
                                        >
                                          <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton 
                                          size="small"
                                          color="error"
                                          onClick={() => handleDeleteItem(item.id)}
                                        >
                                          <DeleteIcon fontSize="small" />
                                        </IconButton>
                                      </TableCell>
                                    </TableRow>
                                  ))
                                ) : (
                                  <TableRow>
                                    <TableCell colSpan={5} sx={{ textAlign: 'center', color: 'text.secondary' }}>
                                      No storage items found
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}

                        {/* Loot Requests Tab */}
                        {storageTab === 1 && (
                          <TableContainer>
                            <Table>
                              <TableHead>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Item</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Requested By</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Requested At</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {lootRequests.length > 0 ? (
                                  lootRequests.map((request) => (
                                    <TableRow key={request.id}>
                                      <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                          {request.storageItem?.Item?.icon && (
                                            <Box
                                              component="img"
                                              src={request.storageItem.Item.icon}
                                              alt={request.storageItem?.Item?.name}
                                              sx={{ width: 24, height: 24, mr: 1 }}
                                            />
                                          )}
                                          <Typography sx={{ color: 'text.primary' }}>
                                            {request.storageItem?.Item?.name || 'Unknown Item'}
                                          </Typography>
                                        </Box>
                                      </TableCell>
                                      <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                          {request.user?.avatar_url && (
                                            <Box
                                              component="img"
                                              src={request.user.avatar_url}
                                              alt={request.user?.username}
                                              sx={{ width: 24, height: 24, borderRadius: '50%', mr: 1 }}
                                            />
                                          )}
                                          <Typography sx={{ color: 'text.primary' }}>
                                            {request.user?.username || 'Unknown User'}
                                          </Typography>
                                        </Box>
                                      </TableCell>
                                      <TableCell>
                                        <Chip 
                                          label={request.status} 
                                          size="small"
                                          sx={{ 
                                            bgcolor: request.status === 'Pending' 
                                              ? 'rgba(255, 193, 7, 0.2)'
                                              : request.status === 'Approved'
                                                ? 'rgba(52, 211, 153, 0.2)'
                                                : 'rgba(239, 68, 68, 0.2)',
                                            color: request.status === 'Pending' 
                                              ? '#ffc107'
                                              : request.status === 'Approved'
                                                ? '#34d399'
                                                : '#ef4444'
                                          }}
                                        />
                                      </TableCell>
                                      <TableCell>
                                        {request.created_at && format(new Date(request.created_at), 'MM/dd/yyyy HH:mm')}
                                      </TableCell>
                                      <TableCell>
                                        {request.status === 'Pending' && (
                                          <>
                                            <Button
                                              variant="outlined"
                                              size="small"
                                              color="success"
                                              onClick={() => handleApproveDenyRequest(request.id, 'Approved')}
                                              sx={{ mr: 1 }}
                                            >
                                              Approve
                                            </Button>
                                            <Button
                                              variant="outlined"
                                              size="small"
                                              color="error"
                                              onClick={() => handleApproveDenyRequest(request.id, 'Denied')}
                                            >
                                              Deny
                                            </Button>
                                          </>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))
                                ) : (
                                  <TableRow>
                                    <TableCell colSpan={5} sx={{ textAlign: 'center', color: 'text.secondary' }}>
                                      No loot requests found
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}

                        {/* Wishlists Tab */}
                        {storageTab === 2 && (
                          <TableContainer>
                            <Table>
                              <TableHead>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Member</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Item</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Priority</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Notes</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {wishlists.length > 0 ? (
                                  wishlists.map((wish) => (
                                    <TableRow key={wish.id}>
                                      <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                          {wish.User?.avatar_url && (
                                            <Box
                                              component="img"
                                              src={wish.User.avatar_url}
                                              alt={wish.User?.username}
                                              sx={{ width: 24, height: 24, borderRadius: '50%', mr: 1 }}
                                            />
                                          )}
                                          <Typography sx={{ color: 'text.primary' }}>
                                            {wish.User?.username || 'Unknown User'}
                                          </Typography>
                                        </Box>
                                      </TableCell>
                                      <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                          {wish.Item?.icon && (
                                            <Box
                                              component="img"
                                              src={wish.Item.icon}
                                              alt={wish.Item?.name}
                                              sx={{ width: 24, height: 24, mr: 1 }}
                                            />
                                          )}
                                          <Typography sx={{ color: 'text.primary' }}>
                                            {wish.Item?.name || wish.item_name || 'Unknown Item'}
                                          </Typography>
                                        </Box>
                                      </TableCell>
                                      <TableCell>
                                        {wish.priority > 0 ? (
                                          <Chip 
                                            label={`${wish.priority} DKP`} 
                                            size="small"
                                            sx={{ bgcolor: 'rgba(255, 215, 0, 0.2)', color: '#ffd700' }}
                                          />
                                        ) : 'None'}
                                      </TableCell>
                                      <TableCell>{wish.notes || 'No notes'}</TableCell>
                                    </TableRow>
                                  ))
                                ) : (
                                  <TableRow>
                                    <TableCell colSpan={4} sx={{ textAlign: 'center', color: 'text.secondary' }}>
                                      No wishlist items found
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}
                      </>
                    )}
                  </Paper>
                </Grid>
                
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">Members ({guildDetails?.members?.length || 0})</Typography>
                    </Box>
                    
                    {guildDetails?.members?.length > 0 ? (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold' }}>User ID</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>Username</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>Discord ID</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {guildDetails.members.map((member) => (
                              <TableRow key={member.id}>
                                <TableCell sx={{ color: 'text.secondary' }}>
                                  {member.user_id}
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    {member.User?.avatar_url && (
                                      <Box
                                        component="img"
                                        src={member.User.avatar_url}
                                        alt={member.User.username}
                                        sx={{ width: 24, height: 24, borderRadius: '50%', mr: 1 }}
                                      />
                                    )}
                                    <Typography>
                                      {member.User?.username || 'Unknown'}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell sx={{ color: 'text.secondary' }}>
                                  {member.User?.discord_id || 'N/A'}
                                </TableCell>
                                <TableCell>
                                  {member.role}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Typography color="text.secondary">No members found</Typography>
                    )}
                  </Paper>
                </Grid>
                
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, bgcolor: 'rgba(239, 68, 68, 0.1)' }}>
                    <Typography variant="h6" gutterBottom sx={{ color: '#ef4444' }}>
                      Danger Zone
                    </Typography>
                    
                    <Button
                      variant="outlined"
                      startIcon={<DeleteIcon />}
                      onClick={() => setDeleteDialogOpen(true)}
                      sx={{ 
                        borderColor: '#ef4444',
                        color: '#ef4444',
                        '&:hover': { borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' }
                      }}
                    >
                      Delete Guild
                    </Button>
                  </Paper>
                </Grid>
              </Grid>
            )}
          </DialogContent>
        </Dialog>
        
        {/* User Details Dialog */}
        <Dialog
          open={userDetailsOpen}
          onClose={() => setUserDetailsOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                User Details: {userDetails?.user?.username}
              </Typography>
              <IconButton onClick={() => setUserDetailsOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          
          <DialogContent dividers>
            {detailsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>User Information</Typography>
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">ID</Typography>
                      <Typography variant="body1" sx={{ mb: 1 }}>{userDetails?.user?.id}</Typography>
                      
                      <Typography variant="subtitle2" color="text.secondary">Discord ID</Typography>
                      <Typography variant="body1" sx={{ mb: 1 }}>{userDetails?.user?.discord_id}</Typography>
                      
                      <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                      <Typography variant="body1" sx={{ mb: 1 }}>{userDetails?.user?.email || 'Not provided'}</Typography>
                      
                      <Typography variant="subtitle2" color="text.secondary">Created At</Typography>
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        {userDetails?.user?.created_at && format(new Date(userDetails.user.created_at), 'MM/dd/yyyy HH:mm:ss')}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>Guild Memberships</Typography>
                    
                    {userDetails?.memberships?.length > 0 ? (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold' }}>Guild</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>Joined At</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {userDetails.memberships.map((membership, i) => (
                              <TableRow key={i}>
                                <TableCell>{membership.guildName}</TableCell>
                                <TableCell>{membership.role}</TableCell>
                                <TableCell>
                                  <Chip 
                                    label={membership.guildStatus} 
                                    size="small"
                                    sx={{ 
                                      bgcolor: membership.guildStatus === 'ACTIVE' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                      color: membership.guildStatus === 'ACTIVE' ? '#34d399' : '#ef4444'
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  {membership.joinedAt && format(new Date(membership.joinedAt), 'MM/dd/yyyy')}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Typography color="text.secondary">No guild memberships found</Typography>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            )}
          </DialogContent>
        </Dialog>
        
        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
        >
          <DialogTitle sx={{ color: '#ef4444' }}>Delete Guild</DialogTitle>
          <DialogContent>
            <Typography variant="body1" paragraph>
              This action cannot be undone. This will permanently delete the guild
              <strong> {selectedGuild?.name}</strong>, all of its data, and remove all
              members from the guild.
            </Typography>
            
            <Typography variant="body1" paragraph>
              Please type <strong>{selectedGuild?.name}</strong> to confirm.
            </Typography>
            
            <TextField
              autoFocus
              fullWidth
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteGuild} 
              variant="contained"
              sx={{ 
                backgroundColor: '#ef4444',
                '&:hover': { backgroundColor: '#dc2626' }
              }}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add/Edit Item Dialog */}
        <Dialog
          open={itemDialog}
          onClose={() => setItemDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editMode ? 'Edit Storage Item' : 'Add Item to Storage'}
          </DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
              <InputLabel id="item-select-label">Item</InputLabel>
              <Select
                labelId="item-select-label"
                name="item_id"
                value={itemFormData.item_id}
                onChange={handleFormChange}
                disabled={editMode}
              >
                {availableItems.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {item.icon && (
                        <Box
                          component="img"
                          src={item.icon}
                          alt={item.name}
                          sx={{ width: 24, height: 24, mr: 1 }}
                        />
                      )}
                      {item.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Quantity"
              name="quantity"
              type="number"
              value={itemFormData.quantity}
              onChange={handleFormChange}
              sx={{ mb: 2 }}
            />
           
            <TextField
              fullWidth
              label="DKP Cost"
              name="dkp_cost"
              type="number"
              value={itemFormData.dkp_cost}
              onChange={handleFormChange}
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Trait (Optional)"
              name="trait"
              value={itemFormData.trait}
              onChange={handleFormChange}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setItemDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveItem}
              variant="contained"
              disabled={!itemFormData.item_id}
            >
              {editMode ? 'Update Item' : 'Add Item'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
        open={deleteItemDialogOpen}
        onClose={() => setDeleteItemDialogOpen(false)}
        >
        <DialogTitle>Delete Item</DialogTitle>
        <DialogContent>
            <Typography variant="body1">
            Are you sure you want to delete this item? This action cannot be undone.
            </Typography>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setDeleteItemDialogOpen(false)}>
            Cancel
            </Button>
            <Button 
            onClick={confirmDeleteItem} 
            variant="contained"
            sx={{ 
                backgroundColor: '#ef4444',
                '&:hover': { backgroundColor: '#dc2626' }
            }}
            >
            Delete
            </Button>
        </DialogActions>
        </Dialog>
        
        <Snackbar
          open={openSnackbar}
          autoHideDuration={6000}
          onClose={() => setOpenSnackbar(false)}
          message={successMessage}
          action={
            <IconButton
              size="small"
              color="inherit"
              onClick={() => setOpenSnackbar(false)}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        />
      </Container>
    </ThemeProvider>
  );
};

export default AdminPortal;