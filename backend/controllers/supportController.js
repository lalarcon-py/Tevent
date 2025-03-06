// backend/controllers/supportController.js
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'your-email@gmail.com',
    pass: process.env.SMTP_PASS || 'your-app-password'
  }
});

const supportController = {
  submitTicket: async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { email, subject, description } = req.body;
      const username = req.user.username;
      const userId = req.user.id;
      
      // Handle file uploads
      let imageUrls = [];
      if (req.files && req.files.length > 0) {
        const uploadsDir = path.join(__dirname, '..', 'uploads', 'support');
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        // Process each uploaded file
        for (const file of req.files) {
          const fileName = `${uuidv4()}${path.extname(file.originalname)}`;
          const filePath = path.join(uploadsDir, fileName);
          
          fs.writeFileSync(filePath, file.buffer);
          imageUrls.push(`/uploads/support/${fileName}`);
        }
      }
      
      // Save ticket to database (implement this part based on your data model)
      // const ticket = await db.SupportTicket.create({...});
      
      // Send email notification
      const mailOptions = {
        from: process.env.SMTP_USER || 'your-email@gmail.com',
        to: 'skrinkz1221@gmail.com',
        subject: `Support Ticket: ${subject}`,
        html: `
          <h1>New Support Ticket</h1>
          <p><strong>From:</strong> ${username} (${email})</p>
          <p><strong>User ID:</strong> ${userId}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <h2>Description:</h2>
          <p>${description}</p>
          ${imageUrls.length > 0 ? `
            <h2>Attachments:</h2>
            <ul>
              ${imageUrls.map(url => `<li><a href="${process.env.BASE_URL || 'http://localhost:3002'}${url}">View attachment</a></li>`).join('')}
            </ul>
          ` : ''}
        `
      };
      
      await transporter.sendMail(mailOptions);
      
      res.status(201).json({ message: 'Support ticket submitted successfully' });
    } catch (error) {
      console.error('Support ticket submission error:', error);
      res.status(500).json({ error: 'Failed to submit support ticket' });
    }
  },
  
  // Additional methods as needed
};

module.exports = supportController;