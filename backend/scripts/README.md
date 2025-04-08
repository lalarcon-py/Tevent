# Roll Logic & Cleanup Scripts

This directory contains scripts for managing and maintaining the loot roll system.

## Reprocessing Existing Rolls

The `reprocessRolls.js` script will find rolls with incorrect priority logic and update them to follow the correct priority order: NEED_ITEM > NEED_TRAIT > GREED.

### Running the Cleanup Script

To run the cleanup job to fix existing rolls:

```bash
# From the project root
cd backend
node scripts/reprocessRolls.js
```

This will:

1. Find all roll history entries that haven't been reprocessed yet
2. Check if the correct winner was selected based on the priority order
3. Update the roll history with the correct winner if needed
4. Mark all checked rolls as reprocessed
5. Add a disclaimer to each roll about the updated logic

### What Gets Fixed

The script fixes the following issues:

- Corrects rolls where players with Greed incorrectly won over players with Need
- Ensures Need Item always takes precedence over Need Trait
- Marks all reprocessed entries for transparency

## New Features Added

The system now has the following new features:

1. **Repeat Win Detection**
   - When a player wins an item they've previously won (as Need), it will be flagged
   - The previous win date is displayed in the UI
   - A warning icon appears next to repeat winners

2. **Exclusion of Players Who Left the Guild**
   - Players who are no longer active guild members are automatically excluded from rolls
   - Their requests are marked as "Denied - Left Guild"

3. **Wishlist Auto-Removal**
   - When a player wins an item, it's automatically removed from their wishlist

4. **Reprocessed Roll Indication**
   - Rolls that have been fixed with the new logic are marked as "Reprocessed"
   - A notice appears explaining the change in roll logic

## Priority Order

The correct priority order for rolls is:

1. NEED_ITEM (highest priority)
2. NEED_TRAIT
3. GREED (lowest priority)

Within each priority group, the player with the highest roll wins.