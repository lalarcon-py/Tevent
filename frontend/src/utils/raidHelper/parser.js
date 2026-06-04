// src/utils/raidHelper/parser.js

/**
 * Parses Raid Helper JSON data to TeventGM format
 * @param {Object} raidHelperData - The JSON data from Raid Helper
 * @param {string} timezone - The desired timezone for the event (IANA timezone format, e.g. 'America/New_York')
 * @returns {Object} Parsed data in TeventGM format
 */
export const parseRaidHelperData = (raidHelperData, timezone = 'America/New_York') => {
  if (!raidHelperData) {
    throw new Error('No Raid Helper data provided');
  }

  // Extract event date and time
  // First option: Use the startTime (Unix timestamp in seconds)
  let eventTime = null;
  let originalTimestamp = null;
  
  // Track the timezone information for later use
  const selectedTimezone = timezone;
  
  if (raidHelperData.startTime) {
    // Store the original timestamp
    originalTimestamp = parseInt(raidHelperData.startTime);
    
    // Convert Unix timestamp (seconds) to Date object
    const timestamp = originalTimestamp * 1000; // Convert to milliseconds
    eventTime = new Date(timestamp);
    console.log('Using timestamp:', { 
      originalTimestamp: raidHelperData.startTime,
      milliseconds: timestamp,
      resultDate: eventTime,
      isoString: eventTime.toISOString()
    });
  } 
  // Second option: Use endTime if startTime isn't available
  else if (raidHelperData.endTime) {
    const timestamp = parseInt(raidHelperData.endTime) * 1000; // Convert to milliseconds
    eventTime = new Date(timestamp);
    console.log('Using endTime:', { 
      originalTimestamp: raidHelperData.endTime,
      milliseconds: timestamp,
      resultDate: eventTime,
      isoString: eventTime.toISOString()
    });
  }
  // Third option: Use date and time string
  else if (raidHelperData.date) {
    // Try to determine the format based on the data
    const dateParts = raidHelperData.date.split('-');
    if (dateParts.length !== 3) {
      console.error('Invalid date format:', raidHelperData.date);
      eventTime = new Date(); // Default to current time
    } else {
      // Try both date formats and see which one produces a valid date
      const firstNum = parseInt(dateParts[0]);
      const secondNum = parseInt(dateParts[1]);
      
      // If first number is > 12, it must be a day (DD-MM-YYYY)
      if (firstNum > 12) {
        const day = firstNum;
        const month = secondNum - 1; 
        const year = parseInt(dateParts[2]);
        
        // Parse time
        let hour = 0, minute = 0;
        if (raidHelperData.time) {
          const timeParts = raidHelperData.time.split(':');
          hour = parseInt(timeParts[0]) || 0;
          minute = parseInt(timeParts[1]) || 0;
        }
        
        eventTime = new Date(year, month, day, hour, minute);
        console.log('Using DD-MM-YYYY format:', { 
          day, month: month + 1, year, hour, minute,
          resultDate: eventTime,
          isoString: eventTime.toISOString()
        });
      } 
      // If second number is > 12, first must be month (MM-DD-YYYY)
      else if (secondNum > 12) {
        const month = firstNum - 1;
        const day = secondNum;
        const year = parseInt(dateParts[2]);
        
        // Parse time
        let hour = 0, minute = 0;
        if (raidHelperData.time) {
          const timeParts = raidHelperData.time.split(':');
          hour = parseInt(timeParts[0]) || 0;
          minute = parseInt(timeParts[1]) || 0;
        }
        
        eventTime = new Date(year, month, day, hour, minute);
        console.log('Using MM-DD-YYYY format:', { 
          month: month + 1, day, year, hour, minute,
          resultDate: eventTime,
          isoString: eventTime.toISOString()
        });
      }
      else {
        const day = firstNum;
        const month = secondNum - 1;
        const year = parseInt(dateParts[2]);
        
        // Parse time
        let hour = 0, minute = 0;
        if (raidHelperData.time) {
          const timeParts = raidHelperData.time.split(':');
          hour = parseInt(timeParts[0]) || 0;
          minute = parseInt(timeParts[1]) || 0;
        }
        
        eventTime = new Date(year, month, day, hour, minute);
        console.log('Assuming DD-MM-YYYY format:', { 
          day, month: month + 1, year, hour, minute,
          resultDate: eventTime,
          isoString: eventTime.toISOString()
        });
      }
    }
  }
  
  // No valid date was found
  if (!eventTime) {
    console.warn('No valid date information found, using current time');
    eventTime = new Date();
  }
  
  // store the timezone info for display later
  console.log('Original UTC date:', {
    originalDate: eventTime,
    timestamp: originalTimestamp,
    timezone: selectedTimezone,
    isoString: eventTime ? eventTime.toISOString() : null
  });

  // Format as ISO string and truncate to minutes (YYYY-MM-DDTHH:MM)
  const formattedTime = eventTime ? eventTime.toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16);
  
  /*
  console.log('Raw Raid Helper data:', {
    date: raidHelperData.date,
    time: raidHelperData.time,
    startTime: raidHelperData.startTime,
    endTime: raidHelperData.endTime,
    closingTime: raidHelperData.closingTime,
    formattedTime: formattedTime
  });
  */
  
  // Create event object
  const event = {
    timezone: selectedTimezone, // Store the selected timezone
    originalTimestamp: originalTimestamp, // Store the original Unix timestamp
    title: raidHelperData.displayTitle || raidHelperData.title || 'Imported Event',
    description: raidHelperData.description || 'Imported from Raid Helper',
    eventTime: formattedTime,
    location: raidHelperData.location || '',
    tanks: countRoleSignups(raidHelperData.signUps, 'Tank'),
    healers: countRoleSignups(raidHelperData.signUps, 'Healer'),
    dps: countRoleSignups(raidHelperData.signUps, 'Dps'),
    requirements: '',
    importedFromRaidHelper: true,
    closingTime: raidHelperData.closingTime || null, 
    rawStartTime: raidHelperData.startTime || null
  };
  
  if (raidHelperData.closingTime) {
    console.log('Raw closingTime from Raid Helper:', raidHelperData.closingTime);
    
    const closingTimestamp = parseInt(raidHelperData.closingTime) * 1000;
    const closingDate = new Date(closingTimestamp);
    
    console.log('Parsed closingTime:', {
      timestamp: closingTimestamp,
      date: closingDate,
      isoString: closingDate.toISOString()
    });
    
    event.closingTimeFormatted = closingDate.toISOString().slice(0, 16);
  }

  const participants = parseParticipants(raidHelperData.signUps);

  const teams = createTeamsFromParticipants(participants);

  return {
    event,
    participants,
    teams
  };
};

const countRoleSignups = (signUps, roleName) => {
  if (!signUps || !Array.isArray(signUps)) {
    return 0;
  }
  
  return signUps.filter(signup => 
    signup.className === roleName && 
    signup.status === 'primary'
  ).length;
};

const parseParticipants = (signUps) => {
  if (!signUps || !Array.isArray(signUps)) {
    return [];
  }

  return signUps
    .filter(signup => signup.status === 'primary') // Only include primary signup (exclude bench, absence, etc.)
    .map(signup => {
      // Map Raid Helper roles to Tevent roles
      let role;
      switch (signup.className) {
        case 'Tank':
          role = 'TANK';
          break;
        case 'Healer':
          role = 'HEALER';
          break;
        case 'Dps':
          role = 'DPS';
          break;
        default:
          role = 'DPS';
      }

      let status = 'CONFIRMED';
      
      if (signup.className === 'Absence') {
        status = 'ABSENT';
      } else if (signup.className === 'Bench') {
        status = 'TENTATIVE';
      } else if (signup.className === 'Tentative') {
        status = 'TENTATIVE';
      } else if (signup.className === 'Late') {
        status = 'CONFIRMED'; // Late is still confirmed, but marked as late
      } else if (signup.specName === 'Tentative') {
        status = 'TENTATIVE';
      } else if (signup.specName === 'Absent') {
        status = 'ABSENT';
      }
      
      let isLate = signup.className === 'Late';
      
      console.log(`Processing signup: ${signup.name}, class=${signup.className}, spec=${signup.specName}, status=${status}, isLate=${isLate}`);

      return {
        name: signup.name,
        role,
        specName: signup.specName || '',
        userId: signup.userId, // DiscordID
        discordId: signup.userId,
        status, 
        isLate
      };
    });
};


const createTeamsFromParticipants = (participants) => {
  // Get all tanks as team leaders
  const tanks = participants.filter(p => p.role === 'TANK');
  
  if (tanks.length === 0) {
    return []; // No tanks, no teams
  }

  return tanks.map((tank, index) => {
    return {
      name: `Team ${index + 1}`,
      leader: tank.name,
      members: [] // Will be filled during team assignment
    };
  });
};

export const validateRaidHelperData = (jsonString) => {
  try {
    const data = JSON.parse(jsonString);
    
    // Check for required fields
    if (!data.signUps || !Array.isArray(data.signUps)) {
      return null;
    }
    
    if (!data.startTime && !data.date) {
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Invalid Raid Helper data:', error);
    return null;
  }
};
