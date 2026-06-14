// Provides direct SQL endpoints for guild member reads and deletions.
// Used when the ORM-based route isn't behaving (cache issues, soft-delete conflicts, etc.).
const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const db = require('../models');
const { authenticateJWT } = require('../middleware/auth');
const { validateUUID } = require('../utils/helpers');
const { removeGuildMember } = require('../utils/membershipCleanup');

// Fetches members for a guild using a raw query to bypass Sequelize caching
router.get('/hard-fetch/guild/:guildId/members', authenticateJWT, async (req, res) => {
  const t = await sequelize.transaction({ readOnly: true });

  try {
    const { guildId } = req.params;

    if (!validateUUID(guildId)) {
      await t.rollback();
      return res.status(400).json({ error: 'Invalid guild ID' });
    }

    const [requesterMembership] = await sequelize.query(
      `SELECT id FROM guild_members WHERE guild_id = :guildId AND user_id = :userId`,
      { replacements: { guildId, userId: req.user.id }, type: sequelize.QueryTypes.SELECT, transaction: t }
    );

    if (!requesterMembership) {
      await t.rollback();
      return res.status(403).json({ error: 'Not a member of this guild' });
    }

    const members = await sequelize.query(
      `SELECT
         u.id, u.username, u.discord_id, u.avatar_url, u.combat_power, u.builds, u.status,
         gm.role, gm.created_at as joined_at, gm.joined_via_invite
       FROM guild_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.guild_id = :guildId
       ORDER BY
         CASE
           WHEN gm.role = 'Guild Master' THEN 1
           WHEN gm.role = 'Guild Advisor' THEN 2
           WHEN gm.role = 'Guild Guardian' THEN 3
           ELSE 4
         END ASC,
         gm.created_at ASC`,
      { replacements: { guildId }, type: sequelize.QueryTypes.SELECT, transaction: t }
    );

    await t.commit();
    res.json({ success: true, members, count: members.length });
  } catch (error) {
    if (t && !t.finished) await t.rollback();
    console.error('[HARD-FETCH] Error fetching guild members:', error);
    res.status(500).json({ error: 'Failed to fetch guild members' });
  }
});

// Hard-deletes a guild member by routing through the shared removeGuildMember utility.
// Requires Guild Master role and prevents self-removal.
router.delete('/hard-delete/guild/:guildId/members/:memberId', authenticateJWT, async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { guildId, memberId } = req.params;

    if (!validateUUID(guildId) || !validateUUID(memberId)) {
      await t.rollback();
      return res.status(400).json({ error: 'Invalid guild or member ID' });
    }

    if (memberId === req.user.id) {
      await t.rollback();
      return res.status(400).json({ error: 'Guild Masters cannot remove themselves' });
    }

    const [requesterRole] = await sequelize.query(
      `SELECT role FROM guild_members WHERE guild_id = :guildId AND user_id = :userId`,
      { replacements: { guildId, userId: req.user.id }, type: sequelize.QueryTypes.SELECT, transaction: t }
    );

    if (!requesterRole || requesterRole.role !== 'Guild Master') {
      await t.rollback();
      return res.status(403).json({ error: 'Only Guild Masters can remove members' });
    }

    const [memberCheck] = await sequelize.query(
      `SELECT gm.role, u.username
       FROM guild_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.guild_id = :guildId AND gm.user_id = :memberId`,
      { replacements: { guildId, memberId }, type: sequelize.QueryTypes.SELECT, transaction: t }
    );

    if (!memberCheck) {
      await t.rollback();
      return res.status(404).json({ error: 'Member not found in this guild' });
    }

    if (memberCheck.role === 'Guild Master') {
      await t.rollback();
      return res.status(400).json({ error: 'Cannot remove another Guild Master' });
    }

    await removeGuildMember(guildId, memberId, t);
    await t.commit();

    console.log(`[HARD-DELETE] Removed ${memberCheck.username} from guild ${guildId}`);
    res.json({
      success: true,
      message: `${memberCheck.username} has been removed from the guild`,
      removedMemberId: memberId
    });
  } catch (error) {
    if (t && !t.finished) await t.rollback();
    console.error('[HARD-DELETE] Error removing guild member:', error);
    res.status(500).json({ error: 'Failed to remove member from guild' });
  }
});

// POST fallback for clients that can't send DELETE requests
router.post('/direct-member-delete', authenticateJWT, async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { guildId, memberId, forceDirect } = req.body;

    if (!forceDirect) {
      await t.rollback();
      return res.status(400).json({ error: 'Direct deletion requires the forceDirect flag' });
    }

    if (!validateUUID(guildId) || !validateUUID(memberId)) {
      await t.rollback();
      return res.status(400).json({ error: 'Invalid guild or member ID' });
    }

    if (memberId === req.user.id) {
      await t.rollback();
      return res.status(400).json({ error: 'Cannot remove yourself' });
    }

    const [requesterRole] = await sequelize.query(
      `SELECT role FROM guild_members WHERE guild_id = :guildId AND user_id = :userId`,
      { replacements: { guildId, userId: req.user.id }, type: sequelize.QueryTypes.SELECT, transaction: t }
    );

    if (!requesterRole || requesterRole.role !== 'Guild Master') {
      await t.rollback();
      return res.status(403).json({ error: 'Only Guild Masters can perform this operation' });
    }

    const [memberCheck] = await sequelize.query(
      `SELECT gm.role, u.username
       FROM guild_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.guild_id = :guildId AND gm.user_id = :memberId`,
      { replacements: { guildId, memberId }, type: sequelize.QueryTypes.SELECT, transaction: t }
    );

    await removeGuildMember(guildId, memberId, t);
    await t.commit();

    const username = memberCheck?.username ?? 'Unknown user';
    console.log(`[DIRECT-DELETE] Removed ${username} from guild ${guildId}`);
    res.json({
      success: true,
      message: `${username} has been removed from the guild`
    });
  } catch (error) {
    if (t && !t.finished) await t.rollback();
    console.error('[DIRECT-DELETE] Error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

module.exports = router;
