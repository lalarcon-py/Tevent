#!/usr/bin/env node

/**
 * Script to reprocess existing rolls with incorrect roll logic
 * This will update roll history entries using the new priority order:
 * NEED_ITEM > NEED_TRAIT > GREED
 */

const db = require('../models');
const { Op } = require('sequelize');

async function reprocessRolls() {
  console.log('Starting roll history cleanup job...');
  
  try {
    // Find all roll history entries
    const rollHistories = await db.RollHistory.findAll({
      where: {
        // Only look at non-reprocessed entries
        reprocessed: false
      },
      order: [['roll_time', 'ASC']]
    });
    
    console.log(`Found ${rollHistories.length} roll histories to check`);
    let reprocessedCount = 0;
    
    for (const history of rollHistories) {
      // Get all roll results from this roll
      const rollResults = history.roll_results || [];
      
      if (!rollResults.length) {
        console.log(`Skipping roll history ID ${history.id} - no roll results`);
        continue;
      }
      
      // Group participants by roll type
      const needItemParticipants = rollResults.filter(r => r.need_or_greed === 'NEED_ITEM');
      const needTraitParticipants = rollResults.filter(r => r.need_or_greed === 'NEED_TRAIT');
      const greedParticipants = rollResults.filter(r => r.need_or_greed === 'GREED');
      
      // Determine who should have won based on the new logic
      let correctWinner = null;
      let correctWinnerGroup = null;
      
      // Always prioritize NEED_ITEM over NEED_TRAIT over GREED
      if (needItemParticipants.length > 0) {
        correctWinner = needItemParticipants.reduce((highest, current) => 
          (current.roll_value > highest.roll_value) ? current : highest, needItemParticipants[0]);
        correctWinnerGroup = 'NEED_ITEM';
      } else if (needTraitParticipants.length > 0) {
        correctWinner = needTraitParticipants.reduce((highest, current) => 
          (current.roll_value > highest.roll_value) ? current : highest, needTraitParticipants[0]);
        correctWinnerGroup = 'NEED_TRAIT';
      } else if (greedParticipants.length > 0) {
        correctWinner = greedParticipants.reduce((highest, current) => 
          (current.roll_value > highest.roll_value) ? current : highest, greedParticipants[0]);
        correctWinnerGroup = 'GREED';
      } else {
        console.log(`Skipping roll history ID ${history.id} - no valid participants`);
        continue;
      }
      
      // If the current winner is not the correct winner or if logic was incorrect, update it
      if (!correctWinner || correctWinner.user_id !== history.winner_id) {
        console.log(`Updating roll history ID ${history.id} - incorrect winner`);
        
        // Mark all results with new winner
        const updatedResults = rollResults.map(result => ({
          ...result,
          winner: result.user_id === correctWinner.user_id
        }));
        
        // Update the roll history
        await history.update({
          winner_id: correctWinner.user_id,
          winner_name: correctWinner.username,
          winner_roll: correctWinner.roll_value,
          winner_need_type: correctWinner.need_or_greed,
          roll_results: updatedResults,
          reprocessed: true,
          reprocessed_note: 'Roll updated due to new priority rules: NEED_ITEM > NEED_TRAIT > GREED'
        });
        
        reprocessedCount++;
      } else {
        // Even if the winner is correct, mark it as reprocessed
        await history.update({
          reprocessed: true,
          reprocessed_note: 'Roll verified with new priority rules: NEED_ITEM > NEED_TRAIT > GREED'
        });
      }
    }
    
    console.log(`Reprocessing complete. ${reprocessedCount} rolls were updated.`);
    
  } catch (error) {
    console.error('Error reprocessing rolls:', error);
  } finally {
    // Close database connection
    await db.sequelize.close();
  }
}

// Run the script if executed directly
if (require.main === module) {
  reprocessRolls()
    .then(() => {
      console.log('Roll cleanup completed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('Roll cleanup failed:', err);
      process.exit(1);
    });
}

module.exports = reprocessRolls;