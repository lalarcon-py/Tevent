export const getSelectedBuild = (participant) => {
    if (!participant) return null;
    
    // Try to get the selected build first
    if (participant.selected_build) {
      let selectedBuild = participant.selected_build;
      if (typeof selectedBuild === 'string') {
        try {
          return JSON.parse(selectedBuild);
        } catch (e) {
          console.error('Error parsing selected_build:', e);
        }
      } else {
        return selectedBuild;
      }
    }
    
    // Try to get a build matching the role
    const builds = participant.User?.builds || participant.builds || [];
    if (!Array.isArray(builds) || builds.length === 0) return null;
    
    const roleMapping = {
      'TANK': 'Tank',
      'HEALER': 'Healer',
      'DPS': 'DPS'
    };
    
    const normalizedRole = roleMapping[participant.role?.toUpperCase()] || participant.role;
    
    if (normalizedRole) {
      const matchingBuild = builds.find(b => 
        b.spec?.toUpperCase() === normalizedRole.toUpperCase()
      );
      if (matchingBuild) return matchingBuild;
    }
    
    // Fallback to first build
    return builds[0];
  };