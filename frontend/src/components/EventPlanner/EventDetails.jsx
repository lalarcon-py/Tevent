// EventDetails.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Dialog,
  DialogContent,
  Alert,
  Snackbar,
  Paper,
  Pagination,
  DialogActions,
  Avatar,
  Tooltip,
  DialogTitle
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'; // Added for tentative icon
import { format } from 'date-fns';
import EventForm from './EventForm';
import { useGuildSettings } from '../../contexts/GuildSettingsContext';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DoNotDisturbIcon from '@mui/icons-material/DoNotDisturb';
import { useSimulatedRole } from '../../contexts/SimulatedRoleContext';

const PARTICIPANTS_PER_PAGE = 10;
const API_URL = process.env.REACT_APP_API_URL;

// BuildSelectionDialog component
const BuildSelectionDialog = ({ open, builds, onClose, onSelectBuild }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: '#1a1a1a', color: 'white' }}>
        Select Build for Event
      </DialogTitle>
      <DialogContent sx={{ bgcolor: '#1e1e1e', pt: 2 }}>
        <Typography color="white" sx={{ mb: 2 }}>
          Please select which build you want to use for this event:
        </Typography>
        <List>
          {builds.map((build, index) => {
            // Generate URLs directly from the public folder
            const primaryImageUrl = build.primary ? `/weapons/${build.primary} Art.png` : null;
            const secondaryImageUrl = build.secondary ? `/weapons/${build.secondary} Art.png` : null;
            
            return (
              <ListItem
                key={index}
                button
                onClick={() => onSelectBuild(build)}
                sx={{
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 1,
                  mb: 1,
                  '&:hover': { bgcolor: 'rgba(144, 202, 249, 0.1)' }
                }}
              >
                <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
                  {build.primary && (
                    <img
                      src={primaryImageUrl}
                      alt={build.primary}
                      style={{ width: 24, height: 24 }}
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  )}
                  {build.secondary && (
                    <img
                      src={secondaryImageUrl}
                      alt={build.secondary}
                      style={{ width: 24, height: 24 }}
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  )}
                </Box>
                <ListItemText
                  primary={
                    <Typography color="white">
                      {build.primary} + {build.secondary}
                    </Typography>
                  }
                  secondary={
                    <Typography color={
                      build.spec === 'Tank' ? '#66b3ff' :
                      build.spec === 'Healer' ? '#66ff66' : '#ff6666'
                    }>
                      {build.spec}
                    </Typography>
                  }
                />
              </ListItem>
            );
          })}
        </List>
      </DialogContent>
      <DialogActions sx={{ bgcolor: '#1e1e1e', p: 2 }}>
        <Button onClick={onClose} sx={{ color: 'white' }}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const EventDetails = ({ event, onEventUpdate, onClose }) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [guildId, setGuildId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { settings } = useGuildSettings();
  const isDkpEnabled = settings?.dkpEnabled === true;
  const [successMessage, setSuccessMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [absentees, setAbsentees] = useState([]);
  const [tentatives, setTentatives] = useState([]); // Added state for tentative participants
  const { simulatedRole } = useSimulatedRole();
  const [buildSelectionOpen, setBuildSelectionOpen] = useState(false);
  const [userBuilds, setUserBuilds] = useState([]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/status`, {
          credentials: 'include'
        });
        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
        }
      } catch (error) {
        console.error('Failed to fetch current user:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  // Add permission check helper function - updated to use simulated role
  const hasEventManagementPermission = () => {
    if (!currentUser) return false;
    
    // Use simulated role if available, otherwise use actual role
    const effectiveRole = simulatedRole || currentUser.role;
    return ['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(effectiveRole);
  };

  useEffect(() => {
    const fetchGuildId = async () => {
      try {
        const response = await fetch(`${API_URL}/api/guilds/my-guilds`, {
          credentials: 'include'
        });
        if (response.ok) {
          const guilds = await response.json();
          if (guilds.length > 0) {
            setGuildId(guilds[0].id);
            console.log('Using guild ID for event details:', guilds[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching user guilds:', error);
      }
    };
    
    fetchGuildId();
  }, []);

  const fetchAbsentees = async () => {
    try {
      if (!event?.id) return;
      
      const guildId = localStorage.getItem('guildId');
      if (!guildId) return;
      
      console.log('Fetching absentees for event:', event.id);
      
      const response = await fetch(`${API_URL}/api/events/${event.id}/absentees?guildId=${guildId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Absentees data:', data);
        setAbsentees(data || []);
      }
    } catch (error) {
      console.error('Error fetching absentees:', error);
    }
  };
  
  // New function to fetch tentative participants
  const fetchTentatives = async () => {
    try {
      if (!event?.id) return;
      
      const guildId = localStorage.getItem('guildId');
      if (!guildId) return;
      
      console.log('Fetching tentatives for event:', event.id);
      
      const response = await fetch(`${API_URL}/api/events/${event.id}/tentatives?guildId=${guildId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Tentatives data:', data);
        setTentatives(data || []);
      }
    } catch (error) {
      console.error('Error fetching tentatives:', error);
    }
  };

  useEffect(() => {
    if (event?.id) {
      fetchAbsentees();
      fetchTentatives(); // Fetch tentative participants
    }
  }, [event]);

  const totalPages = Math.ceil((event.participants?.length || 0) / PARTICIPANTS_PER_PAGE);
  const paginatedParticipants = event.participants?.slice(
    (page - 1) * PARTICIPANTS_PER_PAGE,
    page * PARTICIPANTS_PER_PAGE
  );

  // Group participants by role for summary display
  const participantsByRole = {
    TANK: event.participants?.filter(p => p.role === 'TANK').length || 0,
    HEALER: event.participants?.filter(p => p.role === 'HEALER').length || 0,
    DPS: event.participants?.filter(p => p.role === 'DPS').length || 0
  };

  const formatEventTime = (dateString, timezone) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', dateString);
        return 'Invalid date';
      }
      
      if (timezone) {
        // Use Intl.DateTimeFormat to format the date with the correct timezone
        const options = {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          timeZone: timezone
        };
        return new Intl.DateTimeFormat('en-US', options).format(date);
      }
      
      // Fallback to date-fns if no timezone
      return format(date, 'MMMM dd, yyyy HH:mm');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };
  
  // Helper function to format timezone name nicely
  const formatTimezoneName = (timezone) => {
    if (!timezone) return 'UTC';
    try {
      // Extract the location part after the '/' if it exists
      const parts = timezone.split('/');
      if (parts.length > 1) {
        // Replace underscores with spaces and capitalize words
        return parts[1].replace(/_/g, ' ').replace(/\w\S*/g, txt => 
          txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
      }
      return timezone;
    } catch (error) {
      return timezone;
    }
  };

  const signUpWithPrimaryBuild = async () => {
    try {
      setLoading(true);
      if (!currentUser) {
        setError('You must be logged in to sign up');
        return;
      }
    
      // First, check if the user is already signed up for this event
      const isAlreadySignedUp = event.participants?.some(p => p.User?.id === currentUser.id);
      
      if (isAlreadySignedUp) {
        setSuccessMessage("You're already signed up for this event");
        setTimeout(() => setSuccessMessage(null), 3000);
        setLoading(false);
        return;
      }
      
      // Get user data from public users table
      const userResponse = await fetch(`${API_URL}/api/auth/status`, {
        credentials: 'include'
      });
      
      if (!userResponse.ok) {
        throw new Error('Failed to get user data');
      }
      
      const userData = await userResponse.json();
      
      // Check if user has builds
      if (!userData.builds || userData.builds.length === 0) {
        setError("Could not find your primary build. Please set up your builds first.");
        return;
      }
      
      // If user has multiple builds, show the selection dialog
      if (userData.builds.length > 1) {
        console.log('User has multiple builds, opening selection dialog');
        setUserBuilds(userData.builds);
        setBuildSelectionOpen(true);
        setLoading(false);
        return;
      }
      
      // Otherwise use the first build directly
      const primaryBuild = userData.builds[0];
      
      // Determine role based on the build's spec
      let role;
      if (primaryBuild.spec === 'Tank') {
        role = 'TANK';
      } else if (primaryBuild.spec === 'Healer') {
        role = 'HEALER';
      } else {
        role = 'DPS';
      }
      
      // Sign up with the determined role and include the build
      await handleSignUp(role, primaryBuild);
      setSuccessMessage(`Successfully signed up as ${role}`);
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (error) {
      console.error('Error signing up with primary build:', error);
      setError(error.message || 'Failed to sign up with primary build');
    } finally {
      setLoading(false);
    }
  };

  const isCurrentUserAbsent = () => {
    if (!currentUser) return false;
    return absentees.some(a => 
      a.user_id === currentUser.id || 
      a.User?.id === currentUser.id
    );
  };

  const isCurrentUserTentative = () => {
    if (!currentUser) return false;
    return tentatives.some(t => 
      t.user_id === currentUser.id || 
      t.User?.id === currentUser.id
    );
  };

  const handleSignUp = async (role, selectedBuild) => {
    try {
      if (!currentUser) {
        setError('You must be logged in to sign up');
        return;
      }
    
      // Check if user is already signed up
      const existingSignup = event.participants?.find(p => p.User?.id === currentUser.id);
      
      if (existingSignup) {
        // If already signed up with the same role, do nothing
        if (existingSignup.role === role) {
          return;
        }
        
        // If signed up with different role, remove the existing signup first
        await handleRemoveParticipant(currentUser.id);
      }
      
      console.log(`Signing up for role ${role} with guild ID: ${guildId}`);
      
      // Ensure selectedBuild is included in the request
      console.log('Using selected build for signup:', selectedBuild);
      
      const response = await fetch(`${API_URL}/api/events/${event.id}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          role,
          selectedBuild,
          status: 'CONFIRMED', // Explicitly set status to CONFIRMED
          guildId: guildId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sign up');
      }
      await onEventUpdate();
    } catch (error) {
      console.error('Error signing up:', error);
      setError(error.message);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      // Check if user has permission to change roles
      if (!hasEventManagementPermission() && userId !== currentUser?.id) {
        setError('You do not have permission to change roles for other users');
        return;
      }

      await handleRemoveParticipant(userId);
      const response = await fetch(`${API_URL}/api/events/${event.id}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          role: newRole, 
          userId,
          guildId: guildId // Add this line
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to change role');
      }
      
      await onEventUpdate();
    } catch (error) {
      console.error('Error changing role:', error);
      setError(error.message);
    }
  };

  const handleRemoveParticipant = async (userId) => {
    try {
      // Check if user has permission to remove participants
      if (!hasEventManagementPermission() && userId !== currentUser?.id) {
        setError('You do not have permission to remove other participants');
        return;
      }

      const response = await fetch(`${API_URL}/api/events/${event.id}/signup`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          userId,
          guildId: guildId // Add this line
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove participant');
      }
      
      await onEventUpdate();
    } catch (error) {
      console.error('Error removing participant:', error);
      setError(error.message);
    }
  };

  const markAsAbsent = async (eventIdParam) => {
    try {
      // Check if user is already absent
      if (isCurrentUserAbsent()) {
        setSuccessMessage("You're already marked as absent for this event");
        setTimeout(() => setSuccessMessage(null), 3000);
        return;
      }
      
      // Use the parameter directly if provided, otherwise use event.id
      const eventIdString = eventIdParam || event.id;
      
      if (!eventIdString) {
        throw new Error('Invalid event ID');
      }
      
      console.log('Marking absence for event ID:', eventIdString);
      
      // Get current user data
      const userResponse = await fetch(`${API_URL}/api/auth/status`, {
        credentials: 'include'
      });
      
      if (!userResponse.ok) {
        throw new Error('Failed to get user data');
      }
      
      const userData = await userResponse.json();
      
      // Get guild ID
      const guildId = localStorage.getItem('guildId');
      if (!guildId) {
        throw new Error('Guild ID not found. Please reload the page.');
      }
      
      // Check if user has builds
      if (!userData.builds || userData.builds.length === 0) {
        throw new Error("Could not find your primary build. Please set up your builds first.");
      }
      
      // Determine role based on build spec
      let role;
      const primaryBuild = userData.builds[0];
      if (primaryBuild.spec === 'Tank') {
        role = 'TANK';
      } else if (primaryBuild.spec === 'Healer') {
        role = 'HEALER';
      } else {
        role = 'DPS';
      }
      
      // First, remove existing participation if any
      try {
        const deleteResponse = await fetch(`${API_URL}/api/events/${eventIdString}/signup`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ 
            userId: userData.id,
            guildId: guildId
          })
        });
      } catch (error) {
        console.warn('Error removing existing participation:', error);
        // Continue anyway - they might not be signed up yet
      }
      
      // Sign up with the role
      const signupResponse = await fetch(`${API_URL}/api/events/${eventIdString}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          role,
          guildId: guildId
        })
      });
      
      if (!signupResponse.ok) {
        const errorData = await signupResponse.json();
        console.error('Signup response error:', errorData);
        throw new Error(errorData.error || 'Failed to process signup');
      }
      
      // Then immediately delete to mark as absent
      const absentResponse = await fetch(`${API_URL}/api/events/${eventIdString}/signup`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          userId: userData.id,
          guildId: guildId,
          markAsAbsent: true  // Add this flag
        })
      });
      
      if (!absentResponse.ok) {
        const errorData = await absentResponse.json();
        throw new Error(errorData.error || 'Failed to mark as absent');
      }
      
      // Refresh event data
      if (onEventUpdate) {
        await onEventUpdate();
      }
      
      // Fetch absentees
      await fetchAbsentees();
      
      setSuccessMessage("You've been marked as absent for this event");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error marking as absent:', error);
      setError(error.message || 'Failed to mark as absent');
    }
  };
  
  // New function to mark as tentative
  const markAsTentative = async (eventIdParam) => {
    try {
      setLoading(true);
      
      // Check if user is already tentative
      if (isCurrentUserTentative()) {
        setSuccessMessage("You're already marked as tentative for this event");
        setTimeout(() => setSuccessMessage(null), 3000);
        setLoading(false);
        return;
      }
      
      // Ensure eventId is a string
      const eventIdString = eventIdParam || event.id;
      
      if (!eventIdString) {
        throw new Error('Invalid event ID');
      }
      
      console.log('Marking tentative for event ID:', eventIdString);
      
      // Get current user data
      const userResponse = await fetch(`${API_URL}/api/auth/status`, {
        credentials: 'include'
      });
      
      if (!userResponse.ok) {
        throw new Error('Failed to get user data');
      }
      
      const userData = await userResponse.json();
      
      // Get guild ID
      const guildId = localStorage.getItem('guildId');
      if (!guildId) {
        throw new Error('Guild ID not found. Please reload the page.');
      }
      
      // Check if user has builds
      if (!userData.builds || userData.builds.length === 0) {
        throw new Error("Could not find your primary build. Please set up your builds first.");
      }
      
      // Determine role based on build spec
      let role;
      const primaryBuild = userData.builds[0];
      if (primaryBuild.spec === 'Tank') {
        role = 'TANK';
      } else if (primaryBuild.spec === 'Healer') {
        role = 'HEALER';
      } else {
        role = 'DPS';
      }
      
      // First, remove existing participation if any
      try {
        const deleteResponse = await fetch(`${API_URL}/api/events/${eventIdString}/signup`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ 
            userId: userData.id,
            guildId: guildId
          })
        });
      } catch (error) {
        console.warn('Error removing existing participation:', error);
        // Continue anyway - they might not be signed up yet
      }
      
      // Sign up with the role and mark as tentative
      const signupResponse = await fetch(`${API_URL}/api/events/${eventIdString}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          role,
          status: 'TENTATIVE',  // New status parameter
          guildId: guildId,
          selectedBuild: primaryBuild
        })
      });
      
      if (!signupResponse.ok) {
        const errorData = await signupResponse.json();
        console.error('Signup response error:', errorData);
        throw new Error(errorData.error || 'Failed to mark as tentative');
      }
      
      // Refresh event data
      if (onEventUpdate) {
        await onEventUpdate();
      }
      
      // Fetch updated tentative list
      await fetchTentatives();
      
      setSuccessMessage("You've been marked as tentative for this event");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error marking as tentative:', error);
      setError(error.message || 'Failed to mark as tentative');
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/events`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      
      const data = await response.json();
      
      // Filter for upcoming events only
      const upcomingEvents = data
        .filter(event => {
          const eventDate = new Date(event.event_time);
          const now = new Date();
          return eventDate > now;
        })
        .sort((a, b) => new Date(a.event_time) - new Date(b.event_time));
      
      // Call onEventUpdate instead of using setEvents
      onEventUpdate();
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteEvent = async () => {
    if (!event) return;
  
    // Check permissions before delete
    if (!hasEventManagementPermission()) {
      setError('You do not have permission to delete events');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this event?')) return;
    setIsDeleting(true);
  
    try {
      const response = await fetch(
        `${API_URL}/api/events/${event.id}?guildId=${guildId}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete event');
      }

      onEventUpdate();
      onClose();
    } catch (error) {
      console.error('Delete error:', error);
      setError(error.message || 'Failed to delete event');
    } finally {
      setIsDeleting(false);
    }
  };

  const ParticipantsList = () => (
    <Paper 
      sx={{ 
        maxHeight: 400, 
        overflow: 'auto',
        bgcolor: '#242424',
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: '#1a1a1a',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#888',
          borderRadius: '4px',
        },
      }}
    >
      <List dense>
        {paginatedParticipants?.map((participant) => {
          // Get the builds data from the User object
          const builds = participant.User?.builds || [];
          // Get the primary and secondary weapons
          const primary = builds[0]?.primary || '';
          const secondary = builds[0]?.secondary || '';
          
          return (
            <ListItem 
              key={participant.id}
              sx={{
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                '&:last-child': {
                  borderBottom: 'none'
                }
              }}
            >
              {/* Show weapons if available */}
              {(primary || secondary) && (
                <Box sx={{ display: 'flex', minWidth: 60, mr: 1 }}>
                  {primary && (
                    <Tooltip title={primary}>
                      <Box 
                        component="img"
                        src={`/weapons/${primary} Art.png`}
                        alt={primary}
                        sx={{ width: 24, height: 24, mr: 0.5 }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </Tooltip>
                  )}
                  {secondary && (
                    <Tooltip title={secondary}>
                      <Box 
                        component="img"
                        src={`/weapons/${secondary} Art.png`}
                        alt={secondary}
                        sx={{ width: 24, height: 24 }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </Tooltip>
                  )}
                </Box>
              )}
              
              <ListItemText
                primary={
                  <Typography variant="body2" color="white">
                    {participant.User.username}
                  </Typography>
                }
                secondary={
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label="Tank"
                      size="small"
                      onClick={() => handleRoleChange(participant.User.id, 'TANK')}
                      color={participant.role === 'TANK' ? 'primary' : 'default'}
                      sx={{ mr: 0.5 }}
                    />
                    <Chip
                      label="Healer"
                      size="small"
                      onClick={() => handleRoleChange(participant.User.id, 'HEALER')}
                      color={participant.role === 'HEALER' ? 'success' : 'default'}
                      sx={{ mr: 0.5 }}
                    />
                    <Chip
                      label="DPS"
                      size="small"
                      onClick={() => handleRoleChange(participant.User.id, 'DPS')}
                      color={participant.role === 'DPS' ? 'error' : 'default'}
                    />
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <IconButton 
                  edge="end" 
                  onClick={() => handleRemoveParticipant(participant.User.id)}
                  size="small"
                  sx={{ color: '#ff4444' }}
                >
                  <PersonRemoveIcon fontSize="small" />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          );
        })}
      </List>
    </Paper>
  );

  return (
    <DialogContent sx={{ bgcolor: '#1a1a1a', color: 'white', p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">{event.title}</Typography>
        <Box>
        <Link 
            to={`/events/${event.id}/team-planner`}
            style={{ textDecoration: 'none' }}
          >
            <Button 
              variant="contained" 
              color="primary" 
              sx={{ 
                mr: 1,
                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                fontSize: '0.95rem',
                fontWeight: 'bold',
                padding: '8px 16px',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1976D2 30%, #00B0FF 90%)',
                  transform: 'translateY(-2px)',
                  transition: 'all 0.2s'
                }
              }}
            >
              Team Planner
            </Button>
          </Link>
          {hasEventManagementPermission() && (
            <Button
              startIcon={<EditIcon />}
              onClick={() => setIsEditDialogOpen(true)}
              sx={{ color: '#90caf9' }}
            >
              Edit
            </Button>
          )}
        </Box>
      </Box>
  
      {/* Success message */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}
      
      {/* Error message */}
      {error && (
        <Snackbar 
          open={!!error} 
          autoHideDuration={6000} 
          onClose={() => setError(null)}
        >
          <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>
      )}
  
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" color="grey.400">Time</Typography>
          <Typography>{formatEventTime(event.event_time, event.timezone)}</Typography>
          
          <Box mt={1}>
            <Typography variant="subtitle1" color="grey.400">Timezone</Typography>
            <Typography>{formatTimezoneName(event.timezone) || 'UTC'}</Typography>
          </Box>
          
          <Box mt={2}>
            <Typography variant="subtitle1" color="grey.400">Location</Typography>
            <Typography>{event.location}</Typography>
          </Box>
  
          <Box mt={2}>
            <Typography variant="subtitle1" color="grey.400">Description</Typography>
            <Typography>{event.description}</Typography>
          </Box>
          
          {/* Display DKP value only if DKP is enabled */}
          {isDkpEnabled && event.dkp_value > 0 && (
            <Box mt={2}>
              <Typography variant="subtitle1" color="grey.400">DKP Value</Typography>
              <Typography sx={{ color: '#ffd700', fontWeight: 'bold' }}>
                {event.dkp_value} DKP
              </Typography>
            </Box>
          )}
        </Grid>
  
        <Grid item xs={12} md={6}>
          <Box mb={3}>
            <Typography variant="h6" mb={2}>Roles Summary</Typography>
            <Grid container spacing={2} direction="column">
              <Grid item container spacing={1}>
                <Grid item>
                  <Chip 
                    label={`Tanks: ${participantsByRole.TANK}`}
                    color="primary"
                    onClick={() => handleSignUp('TANK')}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'primary.dark'
                      }
                    }}
                  />
                </Grid>
                <Grid item>
                  <Chip 
                    label={`Healers: ${participantsByRole.HEALER}`}
                    color="success"
                    onClick={() => handleSignUp('HEALER')}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'success.dark'
                      }
                    }}
                  />
                </Grid>
                <Grid item>
                  <Chip 
                    label={`DPS: ${participantsByRole.DPS}`}
                    color="error"
                    onClick={() => handleSignUp('DPS')}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'error.dark'
                      }
                    }}
                  />
                </Grid>
                <Grid item>
                  <Chip 
                    label={`Absent: ${absentees?.length || 0}`}
                    color="default"
                    sx={{
                      bgcolor: '#555',
                      '&:hover': {
                        bgcolor: '#666'
                      }
                    }}
                  />
                </Grid>
                <Grid item>
                  <Chip 
                    label={`Tentative: ${tentatives?.length || 0}`}
                    color="warning"
                    sx={{
                      bgcolor: 'rgba(255, 152, 0, 0.2)',
                      color: '#ff9800',
                      '&:hover': {
                        bgcolor: 'rgba(255, 152, 0, 0.3)'
                      }
                    }}
                  />
                </Grid>
              </Grid>
              
              {/* New Sign Up with Primary Build Button */}
              <Grid item>
              <Button
                  variant="contained"
                  fullWidth
                  onClick={signUpWithPrimaryBuild}
                  startIcon={<PersonAddIcon />}
                  sx={{ 
                    mb: 1,
                    background: 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)',
                    boxShadow: '0 3px 5px 2px rgba(76, 175, 80, .3)',
                    color: 'white',
                    fontSize: '0.95rem',
                    fontWeight: 'bold',
                    padding: '10px 16px',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #388E3C 30%, #689F38 90%)',
                      transform: 'translateY(-2px)',
                      transition: 'all 0.2s'
                    },
                    '&.Mui-disabled': {
                      background: 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)',
                      opacity: 0.7
                    }
                  }}
                >
                  Sign Up with Primary Build
                </Button>
              </Grid>
              
              {/* Mark as Tentative Button */}
              <Grid item>
              <Button
                  variant="outlined"
                  color="warning"
                  fullWidth
                  onClick={() => markAsTentative(event.id)}
                  startIcon={<HelpOutlineIcon />}
                  disabled={isCurrentUserTentative()}
                  sx={{ mb: 1 }}
                >
                  {isCurrentUserTentative() ? "Already Marked Tentative" : "Mark as Tentative"}
                </Button>
              </Grid>
              
              {/* Mark as Absent Button */}
              <Grid item>
              <Button
                  variant="outlined"
                  color="error"
                  fullWidth
                  onClick={() => markAsAbsent(event.id)}
                  startIcon={<DoNotDisturbIcon />}
                  disabled={isCurrentUserAbsent()}
                >
                  {isCurrentUserAbsent() ? "Already Marked Absent" : "Mark as Absent"}
                </Button>
              </Grid>
            </Grid>
          </Box>
  
          <Box mb={3}>
            <Typography variant="h6" mb={2}>
              Participants ({event.participants?.length || 0})
            </Typography>
            <ParticipantsList />
            {totalPages > 1 && (
              <Box display="flex" justifyContent="center" mt={2}>
                <Pagination 
                  count={totalPages}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  color="primary"
                  size="small"
                  sx={{
                    '& .MuiPaginationItem-root': {
                      color: 'white'
                    }
                  }}
                />
              </Box>
            )}
          </Box>

          {/* Tentative Section */}
          <Box mb={3}>
            <Typography variant="h6" mb={2}>
              Tentative ({tentatives?.length || 0})
            </Typography>
            {tentatives && tentatives.length > 0 ? (
              <Box>
                {tentatives.map(user => (
                  <Chip
                    key={user.id || user.User?.id}
                    avatar={<Avatar src={user.avatar_url || user.User?.avatar_url} />}
                    label={user.username || user.User?.username}
                    sx={{ m: 0.5, bgcolor: 'rgba(255, 152, 0, 0.1)', color: '#ff9800', border: '1px solid rgba(255, 152, 0, 0.3)' }}
                  />
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No tentative participants
              </Typography>
            )}
          </Box>

          <Box>
            <Typography variant="h6" mb={2}>
              Absents ({absentees?.length || 0})
            </Typography>
            {absentees && absentees.length > 0 ? (
              <Box>
                {absentees.map(user => (
                  <Chip
                    key={user.id || user.User?.id}
                    avatar={<Avatar src={user.avatar_url || user.User?.avatar_url} />}
                    label={user.username || user.User?.username}
                    sx={{ m: 0.5 }}
                  />
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No absents recorded
              </Typography>
            )}
          </Box>
        </Grid>
      </Grid>
  
      {/* Build Selection Dialog - moved outside of ParticipantsList */}
      <BuildSelectionDialog
        open={buildSelectionOpen}
        builds={userBuilds}
        onClose={() => setBuildSelectionOpen(false)}
        // This is a property passed to the BuildSelectionDialog component
        onSelectBuild={async (selectedBuild) => {
          // Determine role based on the selected build's spec
          let role;
          if (selectedBuild.spec === 'Tank') {
            role = 'TANK';
          } else if (selectedBuild.spec === 'Healer') {
            role = 'HEALER';
          } else {
            role = 'DPS';
          }
          
          // Sign up with the determined role and include the selected build
          await handleSignUp(role, selectedBuild);
          setSuccessMessage(`Successfully signed up as ${role} using ${selectedBuild.primary}+${selectedBuild.secondary}`);
          setTimeout(() => setSuccessMessage(null), 3000);
          setBuildSelectionOpen(false);
        }}
      />

      <Dialog 
        open={isEditDialogOpen} 
        onClose={() => setIsEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <EventForm 
          initialData={{
            ...event,
            eventTime: event.event_time,
            dkpValue: event.dkp_value
          }}
          onSubmit={async (updatedData) => {
            try {
              // Check for permissions
              if (!hasEventManagementPermission()) {
                setError('You do not have permission to edit events');
                setIsEditDialogOpen(false);
                return;
              }

              const response = await fetch(`${API_URL}/api/events/${event.id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                  ...updatedData,
                  event_time: updatedData.eventTime,
                  dkp_value: updatedData.dkpValue,
                  guildId: guildId
                })
              });
              
              if (!response.ok) throw new Error('Failed to update event');
              await onEventUpdate();
              setIsEditDialogOpen(false);
            } catch (error) {
              console.error('Error updating event:', error);
              setError(error.message);
            }
          }}
          onClose={() => setIsEditDialogOpen(false)}
        />
      </Dialog>
  
      {/* Delete event button - only shown if user has permission */}
      {hasEventManagementPermission() && (
        <DialogActions>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteEvent}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Event'}
          </Button>
        </DialogActions>
      )}
    </DialogContent>
  );
};

export default EventDetails;