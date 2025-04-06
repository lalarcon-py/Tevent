// src/components/DashboardComponents/CombatStats.jsx
import React from 'react';
import { 
  Typography, 
  Box, 
  Grid, 
  Card, 
  CardContent,
  Button,
  IconButton,
  Tooltip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar
} from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import GradeIcon from '@mui/icons-material/Grade';
import BoltIcon from '@mui/icons-material/Bolt';

const ROLE_COLORS = {
  'Tank': '#66b3ff', // Blue
  'TANK': '#66b3ff',
  'Healer': '#66ff66', // Green
  'HEALER': '#66ff66', 
  'DPS': '#ff6666',   // Red
};

const COLORS = ['#64b5f6', '#81c784', '#ffb74d', '#e57373', '#ba68c8', '#4fc3f7'];

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

class CombatStats extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showSettings: false,
      cpRanges: [
        { min: 0, max: 2000 },
        { min: 2001, max: 2500 },
        { min: 2501, max: 3000 },
        { min: 3001, max: 3500 },
        { min: 3501, max: 10000 }
      ],
      processedData: {
        averageCp: 0,
        classData: [],
        weaponsData: {
          primary: {},
          secondary: {}
        },
        specData: [],
        cpDistribution: {}
      }
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
      
      console.log("Processing combat data:", {
        apiData: data,
        guildMembers
      });
      
      // Initialize data structures
      let averageCp = 0;
      let classData = []; // This will now hold weapon specs (Liberator, etc.)
      let roleData = {}; // Combat roles (DPS, Tank, Healer)
      let weaponsData = {
        primary: {},
        secondary: {}
      };
      let cpDistribution = {};
      
      // First try to use data from API
      if (data && typeof data === 'object') {
        // Get weapons data if available
        if (data.weapons && typeof data.weapons === 'object') {
          weaponsData = data.weapons;
        }
        
        // Get average CP if available
        if (typeof data.average_cp === 'number') {
          averageCp = data.average_cp;
        }
        
        // Get CP distribution if available
        if (data.cp_distribution && typeof data.cp_distribution === 'object') {
          cpDistribution = data.cp_distribution;
        }
      }
      
      // If we have guild members data, process them to get weapon specs and combat roles
      if (guildMembers && Array.isArray(guildMembers) && guildMembers.length > 0) {
        // Calculate average CP if not available
        if (averageCp === 0) {
          const validCpMembers = guildMembers.filter(m => 
            typeof m.combat_power === 'number' && m.combat_power > 0
          );
          
          if (validCpMembers.length > 0) {
            const totalCp = validCpMembers.reduce((sum, m) => sum + m.combat_power, 0);
            averageCp = Math.round(totalCp / validCpMembers.length);
          } else {
            // Default value
            averageCp = 3000;
          }
        }
        
        // Process each member's builds
        const weaponSpecsCount = {};
        const combatRolesCount = {};
        const primaryWeaponsCount = {};
        const secondaryWeaponsCount = {};
        
        guildMembers.forEach(member => {
          if (member.builds && Array.isArray(member.builds)) {
            member.builds.forEach(build => {
              // Track weapon specializations (Liberator, etc.)
              if (build.weapon_spec) {
                weaponSpecsCount[build.weapon_spec] = (weaponSpecsCount[build.weapon_spec] || 0) + 1;
              } else if (build.primary && build.secondary) {
                const spec = getWeaponSpec(build.primary, build.secondary);
                weaponSpecsCount[spec] = (weaponSpecsCount[spec] || 0) + 1;
              }
              
              // Track combat roles (DPS, Tank, Healer)
              if (build.spec) {
                combatRolesCount[build.spec] = (combatRolesCount[build.spec] || 0) + 1;
              }
              
              // Track primary weapons
              if (build.primary) {
                primaryWeaponsCount[build.primary] = (primaryWeaponsCount[build.primary] || 0) + 1;
              }
              
              // Track secondary weapons
              if (build.secondary) {
                secondaryWeaponsCount[build.secondary] = (secondaryWeaponsCount[build.secondary] || 0) + 1;
              }
            });
          }
          
          // Process CP distribution
          if (typeof member.combat_power === 'number' && member.combat_power > 0) {
            // Find the right range in cpRanges
            const range = this.state.cpRanges.find(range => 
              member.combat_power >= range.min && member.combat_power <= range.max
            );
            
            if (range) {
              const rangeKey = `${range.min}-${range.max}`;
              cpDistribution[rangeKey] = (cpDistribution[rangeKey] || 0) + 1;
            }
          }
        });
        
        // Update class data (weapon specs)
        classData = Object.entries(weaponSpecsCount)
          .map(([spec, count]) => ({ name: spec, value: count }))
          .sort((a, b) => b.value - a.value);
        
        // Update role data (combat roles)
        roleData = combatRolesCount;
        
        // Update weapons data if needed
        if (Object.keys(weaponsData.primary).length === 0) {
          weaponsData.primary = primaryWeaponsCount;
          weaponsData.secondary = secondaryWeaponsCount;
        }
      }
      
      this.setState({
        processedData: {
          averageCp,
          classData, // Now contains weapon specs (Liberator, etc.)
          roleData,  // Contains combat roles (DPS, Tank, Healer)
          weaponsData,
          cpDistribution
        }
      });
    } catch (error) {
      console.error("Error processing combat data:", error);
    }
  }

  toggleSettings = () => {
    this.setState(prevState => ({ showSettings: !prevState.showSettings }));
  }

  handleCpRangeChange = (index, field, value) => {
    const newRanges = [...this.state.cpRanges];
    newRanges[index][field] = parseInt(value, 10);
    this.setState({ cpRanges: newRanges }, this.processData);
  }

  handleAddRange = () => {
    if (this.state.cpRanges.length < 5) {
      const lastRange = this.state.cpRanges[this.state.cpRanges.length - 1];
      this.setState({
        cpRanges: [...this.state.cpRanges, { min: lastRange.max + 1, max: lastRange.max + 500 }]
      }, this.processData);
    }
  }

  handleRemoveRange = (index) => {
    if (this.state.cpRanges.length > 1) {
      this.setState({ 
        cpRanges: this.state.cpRanges.filter((_, i) => i !== index) 
      }, this.processData);
    }
  }

  render() {
    const { showSettings, cpRanges, processedData } = this.state;
    const { averageCp, classData, weaponsData, cpDistribution } = processedData;
    
    // Assume admin access for now
    const isAdmin = true;

    if (!this.props.data && !this.props.guildMembers) {
      return (
        <Box>
          <Typography variant="h6" gutterBottom>
            Combat Statistics
          </Typography>
          <Typography>No combat statistics available yet.</Typography>
        </Box>
      );
    }

    // Extract primary weapons data
    const primaryWeapons = weaponsData && weaponsData.primary ? 
      Object.entries(weaponsData.primary)
        .map(([weapon, count]) => ({ weapon, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5) : [];

    // Process CP distribution
    const cpDistributionData = cpRanges.map(range => {
      const rangeKey = `${range.min}-${range.max}`;
      return {
        range: rangeKey,
        count: cpDistribution[rangeKey] || 0,
        label: `${range.min.toLocaleString()}-${range.max.toLocaleString()}`
      };
    });

    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ 
            display: 'flex', 
            alignItems: 'center',
            fontWeight: 'bold',
            m: 0
          }}>
            <BoltIcon sx={{ mr: 1, color: '#64b5f6' }} />
            Combat Statistics
          </Typography>
          
          {isAdmin && (
            <Tooltip title="Configure CP Ranges">
              <Button 
                onClick={this.toggleSettings}
                variant={showSettings ? "contained" : "outlined"}
                color="primary"
                startIcon={showSettings ? <CloseIcon /> : <SettingsIcon />}
                size="small"
              >
                {showSettings ? "Close Settings" : "CP Settings"}
              </Button>
            </Tooltip>
          )}
        </Box>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Box sx={{ 
              p: 3,
              borderRadius: 2,
              bgcolor: 'rgba(20, 20, 30, 0.6)',
              border: '1px solid rgba(255,255,255,0.08)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Avatar sx={{ 
                bgcolor: 'rgba(100, 181, 246, 0.2)', 
                width: 80, 
                height: 80, 
                mb: 2 
              }}>
                <GradeIcon sx={{ fontSize: 40, color: '#64b5f6' }} />
              </Avatar>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Average Combat Power</Typography>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#64b5f6' }}>
                {averageCp.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>across all members</Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card sx={{ 
              bgcolor: 'rgba(20, 20, 30, 0.6)', 
              borderRadius: 2,
              height: '100%',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Role Distribution
                </Typography>
                
                {processedData.roleData && Object.keys(processedData.roleData).length > 0 ? (
                  <Box sx={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(processedData.roleData).map(([role, count]) => ({ name: role, value: count }))}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          outerRadius={100}
                          innerRadius={50}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        >
                          {Object.entries(processedData.roleData).map(([role, count], index) => (
                            <Cell key={`cell-${role}`} fill={ROLE_COLORS[role] || COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend 
                          formatter={(value, entry) => {
                            const count = processedData.roleData[value] || 0;
                            return `${value}: ${count} players`;
                          }}
                          layout="vertical"
                          verticalAlign="middle"
                          align="right"
                        />
                        <RechartsTooltip
                          formatter={(value, name) => {
                            const total = Object.values(processedData.roleData).reduce((sum, val) => sum + val, 0);
                            return [`${value} players (${((value / total) * 100).toFixed(1)}%)`, name];
                          }}
                          contentStyle={{ 
                            backgroundColor: '#1e1e2d', 
                            border: 'none', 
                            borderRadius: '4px', 
                            padding: '10px',
                            color: 'white'
                          }}
                          labelStyle={{ color: 'white' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                ) : (
                  <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
                    No role data available
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Class Distribution */}
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              bgcolor: 'rgba(20, 20, 30, 0.6)', 
              borderRadius: 2,
              height: '100%',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
                  Class Distribution
                </Typography>
                
                {classData.length > 0 ? (
                  <Box sx={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={classData.slice(0, 8)}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          outerRadius={100}
                          innerRadius={50}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        >
                          {classData.slice(0, 8).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend 
                          formatter={(value, entry) => {
                            const item = classData.find(d => d.name === value);
                            return `${value}: ${item ? item.value : 0} players`;
                          }}
                          layout="vertical"
                          verticalAlign="middle"
                          align="right"
                        />
                        <RechartsTooltip
                          formatter={(value, name) => [`${value} players (${((value / classData.reduce((acc, curr) => acc + curr.value, 0)) * 100).toFixed(1)}%)`, name]}
                          contentStyle={{ 
                            backgroundColor: '#1e1e2d', 
                            border: 'none', 
                            borderRadius: '4px', 
                            padding: '10px',
                            color: 'white' // Fix text color
                          }}
                          labelStyle={{ color: 'white' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                ) : (
                  <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
                    No class data available
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          {/* Primary Weapons */}
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              bgcolor: 'rgba(20, 20, 30, 0.6)', 
              borderRadius: 2,
              border: '1px solid rgba(255,255,255,0.08)',
              height: '100%'
            }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
                  Most Popular Weapons
                </Typography>
                
                {primaryWeapons.length > 0 ? (
                  <Box>
                    {primaryWeapons.map((item, index) => (
                      <Box key={index} sx={{ mb: 2.5, px: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" sx={{ 
                            textTransform: 'capitalize',
                            fontWeight: 'medium',
                          }}>
                            {item.weapon}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {item.count} players
                          </Typography>
                        </Box>
                        <Box 
                          sx={{ 
                            height: 8, 
                            width: '100%', 
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: 5,
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                        >
                          <Box 
                            sx={{ 
                              height: '100%', 
                              width: `${(item.count / Math.max(...primaryWeapons.map(w => w.count))) * 100}%`, 
                              bgcolor: COLORS[index % COLORS.length],
                              borderRadius: 5
                            }} 
                          />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
                    No weapon data available
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* CP Range Configuration Dialog */}
        <Dialog 
          open={showSettings} 
          onClose={this.toggleSettings}
          fullWidth
          maxWidth="sm"
          PaperProps={{
            sx: {
              bgcolor: '#1a1a25',
              color: 'white',
              borderRadius: 2
            }
          }}
        >
          <DialogTitle sx={{ 
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
              Configure Combat Power Ranges
            </Typography>
            <IconButton onClick={this.toggleSettings} sx={{ color: 'white' }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          
          <DialogContent sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Set up to 5 CP ranges to categorize members by their combat power.
            </Typography>
            
            {cpRanges.map((range, index) => (
              <Box 
                key={index} 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  mb: 2,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.05)'
                }}
              >
                <Typography sx={{ minWidth: 30, fontWeight: 'medium' }}>
                  {index + 1}
                </Typography>
                
                <TextField
                  label="Min CP"
                  type="number"
                  value={range.min}
                  onChange={(e) => this.handleCpRangeChange(index, 'min', e.target.value)}
                  variant="outlined"
                  size="small"
                  sx={{ 
                    flex: 1,
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': {
                        borderColor: 'rgba(255,255,255,0.2)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255,255,255,0.3)',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255,255,255,0.7)',
                    }
                  }}
                  InputProps={{
                    inputProps: { min: 0, step: 100 }
                  }}
                />
                
                <Typography sx={{ color: 'text.secondary' }}>to</Typography>
                
                <TextField
                  label="Max CP"
                  type="number"
                  value={range.max}
                  onChange={(e) => this.handleCpRangeChange(index, 'max', e.target.value)}
                  variant="outlined"
                  size="small"
                  sx={{ 
                    flex: 1,
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': {
                        borderColor: 'rgba(255,255,255,0.2)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255,255,255,0.3)',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255,255,255,0.7)',
                    }
                  }}
                  InputProps={{
                    inputProps: { min: 0, step: 100 }
                  }}
                />
                
                <IconButton 
                  onClick={() => this.handleRemoveRange(index)}
                  disabled={cpRanges.length <= 1}
                  sx={{ color: 'error.main' }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>
            ))}
            
            {cpRanges.length < 5 && (
              <Button 
                variant="outlined" 
                onClick={this.handleAddRange}
                fullWidth
                sx={{ mt: 2 }}
              >
                Add Range
              </Button>
            )}
          </DialogContent>
          
          <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', p: 2 }}>
            <Button onClick={this.toggleSettings}>Cancel</Button>
            <Button 
              variant="contained" 
              onClick={this.toggleSettings}
              sx={{ bgcolor: '#64b5f6' }}
            >
              Apply Changes
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }
}

export default CombatStats;