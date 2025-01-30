import { useGuild } from '../../contexts/GuildContext';

const GuildHeader = () => {
  const { guildName } = useGuild();

  return (
    <div style={{ 
      padding: '20px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      marginBottom: '16px'
    }}>
      <h2 style={{ 
        margin: 0,
        color: '#90caf9',
        fontSize: '1.5rem',
        fontWeight: 600,
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        overflow: 'hidden'
      }}>
        {guildName}
      </h2>
    </div>
  );
};

export default GuildHeader;