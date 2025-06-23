# TeventGM - Throne and Liberty Guild Management System

**Copyright © 2024-2025 Luis Alarcon. All Rights Reserved.**

## 📜 Intellectual Property Notice

This project, **TeventGM (Throne and Liberty Guild Buddy)**, is the intellectual property of **Luis Alarcon**. 

### License Terms
- Users are welcome to fork and use this project
- **PROPER ATTRIBUTION IS REQUIRED** for every portion of the project used
- All derivative works must clearly credit Luis Alarcon as the original author
- Commercial use requires explicit written permission

### Attribution Requirements
When using any part of this project, you must include:
```
Based on TeventGM by Luis Alarcon (https://github.com/lalarcon-py/Tevent)
Original Copyright © 2024-2025 Luis Alarcon. All Rights Reserved.
```

---

## 🎮 Overview

TeventGM (Throne and Liberty Guild Buddy) is a comprehensive guild management system designed specifically for the MMORPG "Throne and Liberty". It provides guild leaders and officers with powerful tools to manage their guild operations, from member management to loot distribution, event planning, and Discord integration.

## 🌟 Key Features

### Guild Management
- **Member Management**: Track and manage guild members with detailed profiles
- **Role-Based Access Control**: Assign and manage different permission levels
- **Guild Applications**: Process and review applications with approval workflows
- **Member Builds**: Track character builds and gear configurations

### Event Planning & Coordination
- **Event Scheduler**: Create and manage guild events with calendar integration
- **Team Planner**: Organize teams for raids and events
- **Static Teams**: Create persistent team configurations
- **Attendance Tracking**: Monitor member participation
- **Event Signups**: Allow members to sign up for events

### Loot & DKP System
- **Loot Management**: Track and distribute loot fairly
- **DKP (Dragon Kill Points) System**: Implement point-based reward systems
- **Wish Lists**: Members can create and manage loot wish lists
- **Roll History**: Track and audit loot distribution history
- **Guild Storage**: Manage shared guild inventory

### Gear & Character Management
- **Gear Check**: Verify member equipment and stats
- **Build Tracking**: Store and share character builds
- **Item Database**: Comprehensive database of Throne and Liberty items

### Discord Integration
- **Discord Bot Service**: Seamless integration with Discord servers
- **Channel Management**: Configure Discord channels for guild notifications
- **Role Synchronization**: Sync guild roles with Discord roles
- **Application Notifications**: Send application updates to Discord
- **Event Reminders**: Automated event notifications

### Billing & Subscription
- **Subscription Management**: Handle guild subscriptions
- **Billing Integration**: Stripe payment processing
- **Guild Activity Tracking**: Monitor guild activity status

### Admin Features
- **Admin Portal**: Comprehensive administrative controls
- **Audit Logging**: Track all administrative actions
- **Role Simulation**: Test different permission levels
- **Guild Settings**: Customize guild-specific configurations

## 🏗️ Architecture

### Technology Stack

#### Frontend
- **React 18**: Modern UI framework
- **Material-UI (MUI)**: Component library for consistent design
- **React Router**: Client-side routing
- **Context API**: State management
- **Axios**: HTTP client for API communication
- **Recharts**: Data visualization for analytics
- **FullCalendar**: Event calendar integration
- **React DnD**: Drag-and-drop functionality
- **Stripe Elements**: Payment integration

#### Backend
- **Node.js & Express**: Server framework
- **PostgreSQL**: Primary database
- **Sequelize ORM**: Database abstraction layer
- **Passport.js**: Authentication with Discord OAuth
- **JWT**: Token-based authentication
- **Multer**: File upload handling
- **Express Session**: Session management
- **Joi**: Input validation

#### Discord Bot Service
- **Discord.js v14**: Discord API wrapper
- **Express API**: RESTful API for bot commands
- **Redis**: Caching layer (optional)
- **Node-cron**: Scheduled tasks

### Project Structure

```
TeventGM/
├── Throne-and-Liberty-Guild-Buddy/
│   ├── frontend/               # React application
│   │   ├── src/
│   │   │   ├── components/    # Reusable UI components
│   │   │   ├── contexts/      # React Context providers
│   │   │   ├── pages/         # Page components
│   │   │   ├── services/      # API service layer
│   │   │   ├── hooks/         # Custom React hooks
│   │   │   └── utils/         # Utility functions
│   │   └── public/            # Static assets
│   │
│   ├── backend/               # Express API server
│   │   ├── controllers/       # Request handlers
│   │   ├── models/           # Sequelize models
│   │   ├── routes/           # API routes
│   │   ├── middleware/       # Express middleware
│   │   ├── services/         # Business logic
│   │   ├── migrations/       # Database migrations
│   │   └── utils/            # Helper functions
│   │
│   └── discord-bot/          # Discord bot (legacy)
│
└── discord-bot-service/      # Standalone Discord service
    ├── src/
    │   ├── api/             # API endpoints
    │   ├── commands/        # Discord commands
    │   ├── interactions/    # Button/modal handlers
    │   ├── services/        # Bot services
    │   └── utils/           # Utilities
    └── package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js 16.9.0 or higher
- PostgreSQL 12 or higher
- Discord Application (for OAuth and bot)
- Stripe Account (for billing features)

### Environment Setup

#### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/teventgm
DATABASE_USE_SSL=false

# Discord OAuth
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=http://localhost:5000/auth/discord/callback

# Session
SESSION_SECRET=your_session_secret

# JWT
JWT_SECRET=your_jwt_secret

# Discord Bot
DISCORD_BOT_TOKEN=your_bot_token
BOT_API_KEY=your_bot_api_key
BOT_WEBHOOK_SECRET=your_webhook_secret

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

#### Discord Bot Service (.env)
```env
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
BOT_API_KEY=your_api_key
BOT_WEBHOOK_SECRET=your_webhook_secret
DATABASE_URL=postgresql://user:password@localhost:5432/teventgm
PORT=3300
WEBAPP_URL=http://localhost:3000
```

### Installation

1. **Clone the repository**
```bash
git clone [https://github.com/lalarcon-py/Tevent]
cd TeventGM
```

2. **Install dependencies**
```bash
# Install all dependencies
cd Throne-and-Liberty-Guild-Buddy
npm run install:all

# Or install individually
cd backend && npm install
cd ../frontend && npm install
cd ../../discord-bot-service && npm install
```

3. **Setup Database**
```bash
cd Throne-and-Liberty-Guild-Buddy/backend
npm run migrate
npm run seed  # Optional: seed with sample data
```

4. **Start Services**

Development mode (all services):
```bash
cd Throne-and-Liberty-Guild-Buddy
npm run start:dev
```

Or start individually:
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm start

# Terminal 3: Discord Bot
cd discord-bot-service && npm start
```

## 📊 Database Schema

### Core Tables
- **Users**: Discord user information
- **Guilds**: Guild information and settings
- **GuildUsers**: User-guild relationships
- **GuildMembers**: In-game character information
- **Events**: Guild events and raids
- **LootRequests**: Loot distribution records
- **DKPTransactions**: DKP point tracking
- **Items**: Game item database
- **Subscriptions**: Guild subscription status

## 🔒 Security Features

- Discord OAuth2 authentication
- JWT token-based API access
- Role-based access control (RBAC)
- API key authentication for bot service
- Webhook signature verification
- SQL injection protection via Sequelize
- XSS protection
- CORS configuration

## 🎯 API Endpoints

### Authentication
- `GET /auth/discord` - Initiate Discord OAuth
- `GET /auth/discord/callback` - OAuth callback
- `POST /auth/logout` - Logout user
- `GET /auth/status` - Check auth status

### Guild Management
- `GET /api/guilds/my-guilds` - Get user's guilds
- `POST /api/guilds` - Create new guild
- `GET /api/guilds/:id` - Get guild details
- `PUT /api/guilds/:id` - Update guild
- `DELETE /api/guilds/:id` - Delete guild

### Members
- `GET /api/guilds/:id/members` - List guild members
- `POST /api/guilds/:id/members` - Add member
- `PUT /api/members/:id` - Update member
- `DELETE /api/members/:id` - Remove member

### Events
- `GET /api/events` - List events
- `POST /api/events` - Create event
- `GET /api/events/:id` - Get event details
- `PUT /api/events/:id` - Update event
- `POST /api/events/:id/signup` - Sign up for event

### Loot & DKP
- `GET /api/loot-requests` - List loot requests
- `POST /api/loot-requests` - Create loot request
- `PUT /api/loot-requests/:id` - Update request
- `GET /api/dkp/transactions` - Get DKP history
- `POST /api/dkp/transactions` - Add DKP transaction

## 🤝 Contributing

While this project is proprietary, contributions are welcome under the following conditions:

1. All contributions must maintain proper attribution
2. Contributors agree that their contributions become part of the project under the same license
3. Submit pull requests with clear descriptions
4. Follow the existing code style and conventions
5. Add tests for new features
6. Update documentation as needed

## 🐛 Known Issues

- Mobile navigation menu requires optimization
- Some real-time features may require page refresh
- Discord rate limiting may affect bulk operations

## 📝 Future Enhancements

- [ ] Real-time updates via WebSockets
- [ ] Mobile application
- [ ] Advanced analytics dashboard
- [ ] Automated recruitment tools
- [ ] Voice channel integration
- [ ] Multi-language support
- [ ] API rate limiting
- [ ] Backup and restore functionality

## 📧 Contact

For questions, support, or commercial licensing inquiries, please contact Luis Alarcon at [luisalarcongato@gmail.com].

## 🙏 Acknowledgments

- Built with love for the Throne and Liberty community
- Special thanks to all guild leaders who provided feedback
- Discord.js community for excellent documentation
- Material-UI team for the component library

---

**Remember**: This project represents significant development effort. Please respect the intellectual property rights and always provide proper attribution when using any portion of this codebase.

**Copyright © 2024-2025 Luis Alarcon. All Rights Reserved.**
