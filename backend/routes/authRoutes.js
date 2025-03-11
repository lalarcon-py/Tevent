// Bot authentication endpoint
router.post('/bot-login', async (req, res) => {
  try {
    const { botSecret } = req.body;
    
    // Verify bot secret - this should be a secure secret only the bot knows
    if (botSecret !== process.env.BOT_SECRET) {
      return res.status(401).json({ error: 'Invalid bot credentials' });
    }
    
    // Create a bot user session
    req.login({
      id: 'bot-user',
      username: 'Discord Bot',
      role: 'Bot'
    }, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Session creation failed' });
      }
      
      res.status(200).json({ success: true });
    });
  } catch (error) {
    console.error('Bot login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});