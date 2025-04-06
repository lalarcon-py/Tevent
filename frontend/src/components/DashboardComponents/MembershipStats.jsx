// src/components/DashboardComponents/MembershipStats.jsx
import React from 'react';
import { Typography, Box, Divider, Grid, Avatar } from '@mui/material';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';

const ROLE_COLORS = {
  'Tank': '#66b3ff', // Blue
  'TANK': '#66b3ff',
  'Healer': '#66ff66', // Green
  'HEALER': '#66ff66', 
  'DPS': '#ff6666',   // Red
};

const COLORS = ['#64b5f6', '#81c784', '#ffb74d', '#e57373', '#ba68c8', '#4fc3f7'];

const StatCard = ({ icon, title, value, color, secondaryValue, secondaryLabel }) => (
  <Box sx={{ 
    backgroundColor: 'rgba(20, 20, 30, 0.6)', 
    border: `1px solid ${color}30`,
    borderRadius: 2,
    padding: 2.5,
    position: 'relative',
    overflow: 'hidden',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    '&::after': {
      content: '""',
      position: 'absolute',
      top: 0,
      right: 0,
      width: '30%',
      height: '100%',
      background: `linear-gradient(to right, transparent, ${color}20)`,
      opacity: 0.3,
    }
  }}>
    <Box display="flex" alignItems="center">
      <Avatar sx={{ bgcolor: `${color}20`, color: color, mr: 2, width: 56, height: 56 }}>
        {icon}
      </Avatar>
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.875rem' }}>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'white', lineHeight: 1.2 }}>
          {value}
        </Typography>
        {secondaryValue && (
          <Typography variant="body2" sx={{ 
            color: color, 
            display: 'flex', 
            alignItems: 'center',
            mt: 0.5,
            fontWeight: 'medium'
          }}>
            {secondaryValue} {secondaryLabel}
          </Typography>
        )}
      </Box>
    </Box>
  </Box>
);

// Weapon specs from MembersList.jsx
const WEAPON_SPECS = {
  'Crossbow|Dagger': 'Scorpion',
  'Crossbow|Greatsword': 'Outrider',
  'Crossbow|Sword and Shield': 'Raider',
  'Crossbow|Bow': 'Scout',
  'Crossbow|Staff': 'Battleweaver',
  'Crossbow|Wand': 'Fury',
  'Greatsword|Wand': 'Paladin',
  'Greatsword|Dagger': 'Ravager',
  'Greatsword|Sword and Shield': 'Crusader',
  'Greatsword|Bow': 'Ranger',
  'Greatsword|Staff': 'Sentinel',
  'Sword and Shield|Dagger': 'Berserker',
  'Sword and Shield|Bow': 'Warden',
  'Sword and Shield|Staff': 'Disciple',
  'Sword and Shield|Wand': 'Templar',
  'Bow|Dagger': 'Infiltrator',
  'Bow|Staff': 'Liberator',
  'Bow|Wand': 'Seeker',
  'Staff|Dagger': 'Spellblade',
  'Staff|Wand': 'Invocator',
  'Wand|Dagger': 'Darkblighter',
  'Spear|Greatsword': 'Gladiator',
  'Spear|Sword and Shield': 'Steelheart',
  'Spear|Staff': 'Eradicator',
  'Spear|Dagger': 'Shadowdancer',
  'Spear|Crossbow': 'Cavalier',
  'Spear|Wand': 'Voidlance',
  'Spear|Bow': 'Impaler'
};

const getWeaponSpec = (primary, secondary) => {
  const combo1 = `${primary}|${secondary}`;
  const combo2 = `${secondary}|${primary}`;
  return WEAPON_SPECS[combo1] || WEAPON_SPECS[combo2] || 'Unknown Spec';
};

class MembershipStats extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      totalMembers: 0,
      newMembers30d: 0,
      roleDistribution: {}
    };
  }

  componentDidMount() {
    this.processData();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.data !== this.props.data || prevProps.guildMembers !== this.props.guildMembers) {
      this.processData();
    }
  }

  processData = () => {
    try {
      const { data, guildMembers } = this.props;
      if (!data && !guildMembers) return;
      
      console.log("Processing membership data:", {
        apiData: data,
        guildMembers
      });
      
      // Extract member stats from data
      let totalMembers = 0;
      let newMembers30d = 0;
      let roleDistribution = {}; // This will be combat roles (DPS, Tank, Healer)
      
      // First, check if we have direct data from stats API
      if (data && typeof data === 'object') {
        if (typeof data.total_members === 'number') {
          totalMembers = data.total_members;
        }
        
        if (typeof data.new_members_30d === 'number') {
          console.log(`Got new_members_30d from API: ${data.new_members_30d}`);
          newMembers30d = data.new_members_30d;
        }
      }
      
      // If we have guild members data, use it
      if (guildMembers && Array.isArray(guildMembers)) {
        // Set total members from guild members if not set yet
        if (totalMembers === 0) {
          totalMembers = guildMembers.length;
        }
        
        // Calculate new members in last 30 days if not set yet
        if (newMembers30d === 0) {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          // We need to log some examples to debug
          if (guildMembers.length > 0) {
            const sampleMember = guildMembers[0];
            console.log("Sample member data for debugging join dates:", {
              id: sampleMember.id,
              username: sampleMember.username,
              joinedAt: sampleMember.joinedAt,
              createdAt: sampleMember.createdAt,
              created_at: sampleMember.created_at
            });
          }
          
          newMembers30d = guildMembers.filter(member => {
            // First try joinedAt (Discord-style field)
            if (member.joinedAt) {
              try {
                const joinDate = new Date(member.joinedAt);
                return joinDate >= thirtyDaysAgo;
              } catch (e) {
                console.warn("Error parsing joinedAt:", e);
              }
            }
            
            // Then try createdAt (Sequelize default)
            if (member.createdAt) {
              try {
                const createDate = new Date(member.createdAt);
                return createDate >= thirtyDaysAgo;
              } catch (e) {
                console.warn("Error parsing createdAt:", e);
              }
            }
            
            // Finally try created_at (snake_case version)
            if (member.created_at) {
              try {
                const createDate = new Date(member.created_at);
                return createDate >= thirtyDaysAgo;
              } catch (e) {
                console.warn("Error parsing created_at:", e);
              }
            }
            
            return false;
          }).length;
          
          console.log(`Calculated new_members_30d from member data: ${newMembers30d}`);
        }
        
        // Process combat roles (DPS, Tank, Healer)
        const combatRoles = {};
    
        guildMembers.forEach(member => {
          if (member.builds && Array.isArray(member.builds) && member.builds.length > 0) {
            // Only count primary build (first one)
            const primaryBuild = member.builds[0];
            if (primaryBuild.spec) {
              combatRoles[primaryBuild.spec] = (combatRoles[primaryBuild.spec] || 0) + 1;
            }
          }
        });
        
        // Use the combat roles for role distribution
        roleDistribution = combatRoles;
      }
      
      this.setState({
        totalMembers,
        newMembers30d,
        roleDistribution
      });
    } catch (error) {
      console.error("Error processing membership data:", error);
    }
  }

  render() {
    const { totalMembers, newMembers30d, roleDistribution } = this.state;
    
    if (!this.props.data && !this.props.guildMembers) {
      return (
        <Box>
          <Typography variant="h6" gutterBottom>
            Membership Overview
          </Typography>
          <Typography>No membership data available yet.</Typography>
        </Box>
      );
    }

    const roleData = Object.entries(roleDistribution)
      .map(([role, count]) => ({
        name: role,
        value: count
      }))
      .sort((a, b) => b.value - a.value);

    return (
      <Box>
        <Typography variant="h6" gutterBottom sx={{ 
          display: 'flex', 
          alignItems: 'center',
          fontWeight: 'bold',
          mb: 3
        }}>
          <PeopleAltIcon sx={{ mr: 1, color: '#64b5f6' }} />
          Membership Overview
        </Typography>
        
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12}>
            <StatCard 
              icon={<PeopleAltIcon sx={{ fontSize: 30 }} />} 
              title="Total Members" 
              value={totalMembers} 
              color="#64b5f6" 
            />
          </Grid>
          <Grid item xs={12}>
            <StatCard 
              icon={<PersonAddIcon sx={{ fontSize: 30 }} />} 
              title="New Members" 
              value={newMembers30d} 
              color="#81c784"
              secondaryValue="in the last 30 days"
            />
          </Grid>
        </Grid>
        

      </Box>
    );
  }
}

export default MembershipStats;