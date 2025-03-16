import { useGuild } from '../../contexts/GuildContext';
import { useMediaQuery, useTheme } from '@mui/material';

const GuildHeader = () => {
  const { guildName } = useGuild();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <div style={{ 
      padding: isMobile ? '16px 12px' : '20px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      marginBottom: '16px'
    }}>
      <h2 style={{ 
        margin: 0,
        color: '#90caf9',
        fontSize: isMobile ? '1.25rem' : '1.5rem',
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