import axiosInstance from '../config/axios';

const API_URL = process.env.REACT_APP_API_URL || '';

// Static Teams API
export const staticTeamService = {
  // Teams
  getTeams: async (guildId, eventContext = 'Main Event') => {
    return await axiosInstance.get(`/api/static-teams?guildId=${guildId}&eventContext=${encodeURIComponent(eventContext)}`);
  },
  
  getEventContexts: async (guildId) => {
    return await axiosInstance.get(`/api/static-teams/event-contexts?guildId=${guildId}`);
  },

  createTeam: async (name, guildId, eventContext = 'Main Event', description = null, playerLimit = null) => {
    return await axiosInstance.post('/api/static-teams', { 
      name, 
      guildId, 
      eventContext, 
      description, 
      playerLimit 
    });
  },
  
  createMultipleTeams: async (teams, guildId, eventContext = 'Main Event') => {
    return await axiosInstance.post('/api/static-teams/batch', { 
      teams, 
      guildId, 
      eventContext 
    });
  },

  updateTeam: async (id, name, guildId) => {
    return await axiosInstance.put(`/api/static-teams/${id}`, { name, guildId });
  },

  deleteTeam: async (id, guildId) => {
    return await axiosInstance.delete(`/api/static-teams/${id}?guildId=${guildId}`);
  },

  // Team Members
  addMember: async (teamId, memberId, role, sourceTeamId, guildId, selectedBuild) => {
    return await axiosInstance.post(`/api/static-teams/${teamId}/members`, {
      memberId,
      role,
      sourceTeamId,
      guildId,
      selectedBuild
    });
  },

  removeMember: async (teamId, memberId, guildId) => {
    return await axiosInstance.delete(`/api/static-teams/${teamId}/members/${memberId}?guildId=${guildId}`);
  },

  updateMemberBuild: async (teamId, memberId, selectedBuild, guildId) => {
    return await axiosInstance.put(`/api/static-teams/${teamId}/members/${memberId}`, {
      selectedBuild,
      guildId
    });
  },

  // Presets
  getPresets: async (guildId) => {
    return await axiosInstance.get(`/api/static-teams/presets?guildId=${guildId}`);
  },

  getPreset: async (presetId, guildId) => {
    return await axiosInstance.get(`/api/static-teams/presets/${presetId}?guildId=${guildId}`);
  },

  createPreset: async (name, guildId, teams = []) => {
    return await axiosInstance.post('/api/static-teams/presets', {
      name,
      guildId,
      teams
    });
  },

  updatePreset: async (presetId, name, guildId) => {
    return await axiosInstance.put(`/api/static-teams/presets/${presetId}`, {
      name,
      guildId
    });
  },

  deletePreset: async (presetId, guildId) => {
    return await axiosInstance.delete(`/api/static-teams/presets/${presetId}?guildId=${guildId}`);
  },

  saveTeamsToPreset: async (presetId, teams, guildId) => {
    return await axiosInstance.put(`/api/static-teams/presets/${presetId}/teams`, {
      teams,
      guildId
    });
  }
};

export default staticTeamService;