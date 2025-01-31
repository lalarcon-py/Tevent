import { createContext, useState, useContext } from 'react';

const GuildContext = createContext();

export const GuildProvider = ({ children }) => {
  const [guildName, setGuildName] = useState('Tevent');
  const [isGM] = useState(true); // Replace with actual auth check later

  return (
    <GuildContext.Provider value={{ guildName, setGuildName, isGM }}>
      {children}
    </GuildContext.Provider>
  );
};

export const useGuild = () => useContext(GuildContext);