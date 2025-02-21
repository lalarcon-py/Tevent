// components/AttendanceManagement.jsx
import { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, TextField, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Checkbox, Avatar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import axiosInstance from '../../config/axios.js';

const AttendanceManagement = () => {
  const [events, setEvents] = useState([]);
  const [players, setPlayers] = useState([]);
  const [openEventDialog, setOpenEventDialog] = useState(false);
  const [openAttendanceDialog, setOpenAttendanceDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [newEvent, setNewEvent] = useState({
    name: '',
    date: '',
    dkpValue: 10
  });

  useEffect(() => {
    fetchEvents();
    fetchPlayers();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await axiosInstance.get('/api/events');
      setEvents(response.data || []); // Ensure we always have an array
    } catch (error) {
      console.error('Failed to fetch events:', error);
      setEvents([]); // Set empty array on error
    }
  };

  const fetchPlayers = async () => {
    try {
      const response = await axiosInstance.get('/api/members');
      setPlayers(response.data || []); // Ensure we always have an array
    } catch (error) {
      console.error('Failed to fetch players:', error);
      setPlayers([]); // Set empty array on error
    }
  };

  const handleCreateEvent = async () => {
    try {
      await axiosInstance.post('/api/events', newEvent);
      setOpenEventDialog(false);
      fetchEvents();
      setNewEvent({ name: '', date: '', dkpValue: 10 });
    } catch (error) {
      console.error('Failed to create event:', error);
    }
  };

  const handleMarkAttendance = async (eventId, playerId, attended) => {
    try {
      await axiosInstance.post('/api/attendance', {
        eventId,
        playerId,
        attended
      });
      fetchEvents();
    } catch (error) {
      console.error('Failed to mark attendance:', error);
    }
  };

  return (
    <Box>
      <Paper sx={{
        p: 4,
        mb: 4,
        background: 'rgba(30, 30, 30, 0.6)',
        backdropFilter: 'blur(12px)'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6" sx={{ color: '#90caf9' }}>
            Events
          </Typography>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={() => setOpenEventDialog(true)}
            sx={{
              background: 'linear-gradient(45deg, rgba(144, 202, 249, 0.6), rgba(144, 202, 249, 0.8))',
              backdropFilter: 'blur(12px)'
            }}
          >
            Create Event
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Event Name</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>DKP Value</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{event.name}</TableCell>
                  <TableCell>{new Date(event.date).toLocaleDateString()}</TableCell>
                  <TableCell>{event.dkpValue}</TableCell>
                  <TableCell>{event.status}</TableCell>
                  <TableCell>
                    <IconButton 
                      onClick={() => {
                        setSelectedEvent(event);
                        setOpenAttendanceDialog(true);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create Event Dialog */}
      <Dialog open={openEventDialog} onClose={() => setOpenEventDialog(false)}>
        <DialogTitle>Create New Event</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Event Name"
              value={newEvent.name}
              onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
            />
            <TextField
              type="datetime-local"
              label="Date"
              value={newEvent.date}
              onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              type="number"
              label="DKP Value"
              value={newEvent.dkpValue}
              onChange={(e) => setNewEvent({ ...newEvent, dkpValue: Number(e.target.value) })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEventDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateEvent} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Attendance Dialog */}
      <Dialog 
        open={openAttendanceDialog} 
        onClose={() => setOpenAttendanceDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Mark Attendance - {selectedEvent?.name}</DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Player</TableCell>
                  <TableCell>Current DKP</TableCell>
                  <TableCell>Attendance Rate</TableCell>
                  <TableCell>Present</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {players?.map((player) => (
                  <TableRow key={player.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar src={player.avatar}>
                          {player.name ? player.name[0] : ''}
                        </Avatar>
                        {player.name || 'Unknown Player'}
                      </Box>
                    </TableCell>
                    <TableCell>{player.dkp || 0}</TableCell>
                    <TableCell>{player.attendanceRate || 0}%</TableCell>
                    <TableCell>
                      <Checkbox
                        checked={Boolean(player.attended)}
                        onChange={(e) => handleMarkAttendance(
                          selectedEvent?.id,
                          player.id,
                          e.target.checked
                        )}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAttendanceDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AttendanceManagement;