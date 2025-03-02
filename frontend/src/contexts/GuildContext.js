import { createContext, useState, useContext } from 'react';
import { useAuth } from './AuthContext';

const GuildContext = createContext();

export const GuildProvider = ({ children }) => {
  const [guildName, setGuildName] = useState('Tevent');
  const { user } = useAuth();
  const isGM = user && user.role === 'Guild Master';

  return (
    <GuildContext.Provider value={{ guildName, setGuildName, isGM }}>
      {children}
    </GuildContext.Provider>
  );
};

export const useGuild = () => useContext(GuildContext);