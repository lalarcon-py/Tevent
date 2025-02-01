// routes/events.js
router.get('/', async (req, res) => {
    try {
      const events = await Event.findAll({
        include: [{
          model: EventSignup,
          include: [Player]
        }]
      });
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  });
  
  router.post('/signup', async (req, res) => {
    try {
      const { eventId, role } = req.body;
      const playerId = req.user.id; // Assuming authentication middleware
  
      const signup = await EventSignup.create({
        eventId,
        playerId,
        role
      });
  
      res.json(signup);
    } catch (error) {
      res.status(500).json({ error: 'Failed to sign up' });
    }
  });
  
  // When marking attendance and distributing DKP
  router.post('/complete', async (req, res) => {
    try {
      const { eventId, attendees } = req.body;
      const event = await Event.findByPk(eventId);
  
      for (const attendee of attendees) {
        await EventSignup.update(
          {
            status: 'attended',
            dkpEarned: event.dkpValue
          },
          {
            where: {
              eventId,
              playerId: attendee.playerId
            }
          }
        );
  
        // Update player's total DKP
        await Player.increment(
          { dkp: event.dkpValue },
          { where: { id: attendee.playerId } }
        );
      }
  
      res.json({ message: 'Event completed and DKP distributed' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to complete event' });
    }
  });