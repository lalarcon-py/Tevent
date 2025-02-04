// frontend/src/contexts/TeamContext.js
import React, { createContext, useContext, useState } from 'react';

const TeamContext = createContext();

export const TeamProvider = ({ children }) => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTeams = async (eventId) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/events/${eventId}/teams`, {
        credentials: 'include'
      });
      const data = await response.json();
      setTeams(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    teams,
    loading,
    error,
    fetchTeams
  };

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = () => useContext(TeamContext);