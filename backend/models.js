const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('./config/database').sequelize;

// Item Schema
const Item = sequelize.define('Item', {
   id: { 
       type: DataTypes.UUID,
       defaultValue: DataTypes.UUIDV4,
       primaryKey: true 
   },
   name: { type: DataTypes.STRING, allowNull: false },
   type: { type: DataTypes.STRING },
   rarity: { type: DataTypes.ENUM('Common', 'Rare', 'Epic', 'Legendary') },
   dkpCost: { type: DataTypes.INTEGER, defaultValue: 0 },
   inStorage: { type: DataTypes.BOOLEAN, defaultValue: false }, 
   quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
   icon: { type: DataTypes.STRING }
}, {
   tableName: 'items',
   freezeTableName: true
});

// Loot Request Schema
const LootRequest = sequelize.define('LootRequest', {
    id: { 
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true 
    },
    storageItemId: {  // Changed from itemId to storageItemId
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'guild_storage_items',
            key: 'id'
        },
        field: 'storage_item_id'
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        field: 'user_id'
    },
    status: { 
        type: DataTypes.STRING(255),
        defaultValue: 'Pending',
        allowNull: true
    },
    priority: { 
        type: DataTypes.INTEGER, 
        defaultValue: 0,
        allowNull: true
    }
 }, {
    tableName: 'loot_requests',
    freezeTableName: true,
    underscored: true
 });

// DKP Transaction Schema  
const DKPTransaction = sequelize.define('DKPTransaction', {
   id: { 
       type: DataTypes.UUID,
       defaultValue: DataTypes.UUIDV4,
       primaryKey: true 
   },
   amount: { type: DataTypes.INTEGER, allowNull: false },
   reason: { type: DataTypes.TEXT }
}, {
   tableName: 'DKPTransactions',
   freezeTableName: true
});

// User Schema
const User = sequelize.define('User', {
    id: { 
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true 
    },
    discord_id: { type: DataTypes.STRING },
    username: { type: DataTypes.STRING },
    role: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING },
    avatar_url: { type: DataTypes.STRING },
    builds: { 
        type: DataTypes.JSONB,
        defaultValue: [] 
    }
}, {
    tableName: 'users',
    freezeTableName: true
});

// Event Schema
const Event = sequelize.define('Event', {
   id: { 
       type: DataTypes.UUID,
       defaultValue: DataTypes.UUIDV4,
       primaryKey: true 
   },
   title: {
       type: DataTypes.STRING,
       allowNull: false
   },
   description: {
       type: DataTypes.TEXT
   },
   event_time: {
       type: DataTypes.DATE,
       allowNull: false
   },
   location: {
       type: DataTypes.STRING
   },
   tanks: {
       type: DataTypes.INTEGER,
       defaultValue: 2
   },
   healers: {
       type: DataTypes.INTEGER,
       defaultValue: 4
   },
   dps: {
       type: DataTypes.INTEGER,
       defaultValue: 24
   },
   requirements: {
       type: DataTypes.TEXT
   },
   created_by: {
       type: DataTypes.UUID,
       references: {
           model: 'users',
           key: 'id'
       }
   }
}, {
   tableName: 'events',
   underscored: true,
   timestamps: true
});

// EventParticipant Schema
const EventParticipant = sequelize.define('EventParticipant', {
   id: { 
       type: DataTypes.UUID,
       defaultValue: DataTypes.UUIDV4,
       primaryKey: true 
   },
   event_id: {
       type: DataTypes.UUID,
       allowNull: false,
       references: {
           model: 'events',
           key: 'id'
       }
   },
   user_id: {
       type: DataTypes.UUID,
       allowNull: false,
       references: {
           model: 'users',
           key: 'id'
       }
   },
   role: {
       type: DataTypes.STRING,
       allowNull: false,
       validate: {
           isIn: [['TANK', 'HEALER', 'DPS']]
       }
   }
}, {
   tableName: 'event_participants',
   underscored: true,
   timestamps: true
});

const Team = sequelize.define('Team', {
    id: { 
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true 
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    event_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'events',
            key: 'id'
        }
    },
    created_by: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    }
 }, {
    tableName: 'teams',
    underscored: true,
    timestamps: true
 });
 
 // TeamMember Schema
 const TeamMember = sequelize.define('TeamMember', {
    id: { 
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true 
    },
    team_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'teams',
            key: 'id'
        }
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    role: {
        type: DataTypes.STRING,
        allowNull: false
    },
    position: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
 }, {
    tableName: 'team_members',
    underscored: true,
    timestamps: true
 });

 //Team Presets

 const TeamPreset = sequelize.define('TeamPreset', {
    id: { 
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true 
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    event_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'events',
            key: 'id'
        }
    },
    teams_data: {
        type: DataTypes.JSONB,
        allowNull: false
    },
    created_by: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    tableName: 'team_presets',
    underscored: true,
    timestamps: true
});

// Associations
User.hasMany(LootRequest);
Item.hasMany(LootRequest);
User.hasMany(DKPTransaction);
LootRequest.belongsTo(User);
LootRequest.belongsTo(Item);
Team.belongsTo(Event, { foreignKey: 'event_id' });
Team.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Team.hasMany(TeamMember, { foreignKey: 'team_id', as: 'members' });
TeamMember.belongsTo(Team, { foreignKey: 'team_id' });
TeamMember.belongsTo(User, { foreignKey: 'user_id' });
TeamPreset.belongsTo(Event, { foreignKey: 'event_id' });
TeamPreset.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

Event.belongsTo(User, {
   foreignKey: 'created_by',
   as: 'creator'
});

Event.hasMany(EventParticipant, {
   foreignKey: 'event_id',
   as: 'participants'
});

EventParticipant.belongsTo(Event, {
   foreignKey: 'event_id'
});

EventParticipant.belongsTo(User, {
   foreignKey: 'user_id'
});

module.exports = {
   sequelize,
   Item,
   LootRequest,
   DKPTransaction,
   User,
   Event,
   EventParticipant,
   Team,
   TeamMember,
   TeamPreset
};