const validateItem = (req, res, next) => {
    const { name, type } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }
    
    if (req.method === 'PUT' && (req.body.name || req.body.type)) {
      return res.status(400).json({ error: 'Name and type cannot be modified' });
    }
  
    next();
  };
  
  module.exports = validateItem;