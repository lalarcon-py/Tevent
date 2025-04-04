import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Grid,
  Divider,
  Tabs,
  Tab,
  Alert,
  CircularProgress
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { useGuildContext } from '../contexts/GuildContext';
import api from '../services/api';

// Import all Discord setting components
import ChannelConfig from '../components/DiscordSettings/ChannelConfig';
import BotStatus from '../components/DiscordSettings/BotStatus';
import RolePingConfig from '../components/DiscordSettings/RolePingConfig';
import IntegrationSettings from '../components/DiscordSettings/IntegrationSettings';
import WebhookSettings from '../components/DiscordSettings/WebhookSettings';

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`discord-settings-tabpanel-${index}`}
      aria-labelledby={`discord-settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Tab props function
function a11yProps(index) {
  return {
    id: `discord-settings-tab-${index}`,
    'aria-controls': `discord-settings-tabpanel-${index}`,
  };
}

export default function DiscordSettings() {
  const { guildId } = useParams();
  const { guild, loading: guildLoading } = useGuildContext();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [discordGuild, setDiscordGuild] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!guild?.id) return;

    const fetchDiscordInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/api/guilds/${guild.id}/discord-info`);
        setDiscordGuild(response.data);
      } catch (err) {
        console.error('Error fetching Discord guild info:', err);
        setError('Failed to load Discord integration information. Please check if your guild is linked to Discord.');
      } finally {
        setLoading(false);
      }
    };

    fetchDiscordInfo();
  }, [guild?.id]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (guildLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h4" component="h1" gutterBottom>
            Discord Settings
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Configure how the Discord bot interacts with your guild.
          </Typography>
        </Grid>

        {error && (
          <Grid item xs={12}>
            <Alert severity="error">{error}</Alert>
          </Grid>
        )}

        {loading ? (
          <Grid item xs={12}>
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          </Grid>
        ) : discordGuild ? (
          <Grid item xs={12}>
            <Paper sx={{ width: '100%' }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs 
                  value={tabValue} 
                  onChange={handleTabChange} 
                  aria-label="discord settings tabs"
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  <Tab label="Status" {...a11yProps(0)} />
                  <Tab label="Channels" {...a11yProps(1)} />
                  <Tab label="Role Pings" {...a11yProps(2)} />
                  <Tab label="Webhooks" {...a11yProps(3)} />
                  <Tab label="Integration" {...a11yProps(4)} />
                </Tabs>
              </Box>
              
              <TabPanel value={tabValue} index={0}>
                <BotStatus discordGuild={discordGuild} />
              </TabPanel>
              
              <TabPanel value={tabValue} index={1}>
                <ChannelConfig />
              </TabPanel>
              
              <TabPanel value={tabValue} index={2}>
                <RolePingConfig />
              </TabPanel>
              
              <TabPanel value={tabValue} index={3}>
                <WebhookSettings />
              </TabPanel>
              
              <TabPanel value={tabValue} index={4}>
                <IntegrationSettings discordGuild={discordGuild} />
              </TabPanel>
            </Paper>
          </Grid>
        ) : (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Discord Not Connected
              </Typography>
              <Typography paragraph>
                Your guild is not connected to Discord. Please use the Discord bot setup command in your server to link your guild.
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Container>
  );
}
