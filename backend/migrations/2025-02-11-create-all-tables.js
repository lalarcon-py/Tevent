module.exports = {
    up: async (queryInterface, Sequelize) => {
      // Enable UUID extension if not already enabled
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
  
      // Users table
      await queryInterface.createTable('users', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
          allowNull: false
        },
        discord_id: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        username: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        role: {
          type: Sequelize.STRING(255),
          allowNull: false,
          defaultValue: 'Member'
        },
        status: {
          type: Sequelize.STRING(255),
          allowNull: false,
          defaultValue: 'Active'
        },
        avatar_url: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        builds: {
          type: Sequelize.ARRAY(Sequelize.JSONB),
          defaultValue: [],
          allowNull: false
        },
        weapon_spec: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        combat_power: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: true,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: true,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      });
  
      // Local Users table
      await queryInterface.createTable('local_users', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
          allowNull: false
        },
        email: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        password: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        username: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        discord_id: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        email_verified: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: true
        },
        verification_token: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        reset_password_token: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        reset_password_expires: {
          type: Sequelize.DATE,
          allowNull: true
        },
        last_login: {
          type: Sequelize.DATE,
          allowNull: true
        },
        status: {
          type: Sequelize.STRING(20),
          defaultValue: 'inactive',
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: true
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: true
        }
      });
  
      // Events table
      await queryInterface.createTable('events', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
          allowNull: false
        },
        title: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        event_time: {
          type: Sequelize.DATE,
          allowNull: false
        },
        location: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        tanks: {
          type: Sequelize.INTEGER,
          defaultValue: 2,
          allowNull: false
        },
        healers: {
          type: Sequelize.INTEGER,
          defaultValue: 4,
          allowNull: false
        },
        dps: {
          type: Sequelize.INTEGER,
          defaultValue: 24,
          allowNull: false
        },
        requirements: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        created_by: {
          type: Sequelize.UUID,
          references: {
            model: 'users',
            key: 'id'
          },
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: true
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: true
        }
      });
  
      // Teams table
      await queryInterface.createTable('teams', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
          allowNull: false
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        created_by: {
          type: Sequelize.UUID,
          references: {
            model: 'users',
            key: 'id'
          },
          allowNull: true
        },
        event_id: {
          type: Sequelize.UUID,
          references: {
            model: 'events',
            key: 'id'
          },
          allowNull: false
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: true
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: true
        }
      });
  
      // Team Members table
      await queryInterface.createTable('team_members', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
          allowNull: false
        },
        team_id: {
          type: Sequelize.UUID,
          references: {
            model: 'teams',
            key: 'id'
          },
          allowNull: true
        },
        user_id: {
          type: Sequelize.UUID,
          references: {
            model: 'users',
            key: 'id'
          },
          allowNull: true
        },
        role: {
          type: Sequelize.STRING(50),
          allowNull: false
        },
        position: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: true
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: true
        }
      });

      // Items table
      await queryInterface.createTable('items', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'), // Add defaultValue
          primaryKey: true,
          allowNull: false
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        type: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        rarity: {
          type: Sequelize.ENUM('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'),
          allowNull: true
        },
        quantity: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          allowNull: true
        },
        icon: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        dkp_cost: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          allowNull: true
        },
        in_storage: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: true
        },
        traits: {
          type: Sequelize.ARRAY(Sequelize.STRING),
          allowNull: true
        },
        // Add these timestamp fields
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: true
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: true
        }
      });
  
      // Guild Storage Items table
      await queryInterface.createTable('guild_storage_items', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
          allowNull: false
        },
        item_id: {
          type: Sequelize.UUID,
          references: {
            model: 'items',
            key: 'id'
          },
          allowNull: false
        },
        quantity: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          allowNull: true
        },
        trait: {
          type: Sequelize.STRING,
          allowNull: true
        },
        dkp_cost: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: true
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: true
        }
      });
  
      // Loot Requests table
      await queryInterface.createTable('loot_requests', {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false
        },
        status: {
          type: Sequelize.STRING(255),
          defaultValue: 'Pending',
          allowNull: true
        },
        priority: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          allowNull: true
        },
        user_id: {
          type: Sequelize.UUID,
          references: {
            model: 'users',
            key: 'id'
          },
          allowNull: true
        },
        storage_item_id: {
          type: Sequelize.UUID,
          references: {
            model: 'guild_storage_items',
            key: 'id'
          },
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: true
        }
      });
  
      // Event Attendance table
      await queryInterface.createTable('event_attendance', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
          allowNull: false
        },
        event_id: {
          type: Sequelize.UUID,
          references: {
            model: 'events',
            key: 'id'
          },
          allowNull: true
        },
        user_id: {
          type: Sequelize.UUID,
          references: {
            model: 'users',
            key: 'id'
          },
          allowNull: true
        },
        team_id: {
          type: Sequelize.UUID,
          references: {
            model: 'teams',
            key: 'id'
          },
          allowNull: true
        },
        attended: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: true
        },
        arrival_time: {
          type: Sequelize.DATE,
          allowNull: true
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        status: {
          type: Sequelize.STRING(50),
          defaultValue: 'PENDING',
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: true
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: true
        }
      });
  
      // Event Participants table
      await queryInterface.createTable('event_participants', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
          allowNull: false
        },
        event_id: {
          type: Sequelize.UUID,
          references: {
            model: 'events',
            key: 'id'
          },
          allowNull: true
        },
        user_id: {
          type: Sequelize.UUID,
          references: {
            model: 'users',
            key: 'id'
          },
          allowNull: true
        },
        role: {
          type: Sequelize.STRING(10),
          allowNull: false
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: true
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: true
        }
      });
  
      // Alliances table
      await queryInterface.createTable('alliances', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('uuid_generate_v4()'),
          primaryKey: true,
          allowNull: false
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        guild_ids: {
          type: Sequelize.ARRAY(Sequelize.STRING),
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: true
        }
      });
  
      // Combat Power History table
      await queryInterface.createTable('combat_power_history', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
          allowNull: false
        },
        user_id: {
          type: Sequelize.UUID,
          references: {
            model: 'users',
            key: 'id'
          },
          allowNull: true
        },
        combat_power: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        recorded_date: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: true
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: true
        }
      });
  
      // Gear Checks table
      await queryInterface.createTable('gear_checks', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('uuid_generate_v4()'),
          primaryKey: true,
          allowNull: false
        },
        user_id: {
          type: Sequelize.UUID,
          references: {
            model: 'users',
            key: 'id'
          },
          allowNull: true
        },
        image_url: {
          type: Sequelize.STRING(512),
          allowNull: false
        },
        status: {
          type: Sequelize.STRING(20),
          allowNull: true
        },
        verified_items: {
          type: Sequelize.JSONB,
          allowNull: true
        },
        checked_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: true
        }
      });
  
      // Gear Submissions table
      await queryInterface.createTable('gear_submissions', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
        },
        user_id: {
          type: Sequelize.UUID,
          references: {
            model: 'users',
            key: 'id'
          },
          allowNull: false
        },
        image_url: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        status: {
          type: Sequelize.STRING(20),
          defaultValue: 'pending',
          allowNull: true
        },
        reviewed_by: {
          type: Sequelize.UUID,
          references: {
            model: 'users',
            key: 'id'
          },
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: true
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: true
        }
      });
  
      // Guild Master Transfers table
      await queryInterface.createTable('guild_master_transfers', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
          allowNull: false
        },
        old_gm_id: {
          type: Sequelize.UUID,
          references: {
            model: 'users',
            key: 'id'
          },
          allowNull: false
        },
        new_gm_id: {
          type: Sequelize.UUID,
          references: {
            model: 'users',
            key: 'id'
          },
          allowNull: false
        },
        transferred_at: {
          type: Sequelize.DATE,
          allowNull: false
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: false
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: false
        }
      });
  
      // Role Change Logs table
      await queryInterface.createTable('role_change_logs', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
          allowNull: false
        },
        member_id: {
          type: Sequelize.UUID,
          references: {
            model: 'users',
            key: 'id'
          },
          allowNull: false
        },
        old_role: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        new_role: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        changed_by: {
          type: Sequelize.UUID,
          references: {
            model: 'users',
            key: 'id'
          },
          allowNull: false
        },
        changed_at: {
          type: Sequelize.DATE,
          allowNull: false
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: false
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: false
        }
      });
  
      // Team Presets table
      await queryInterface.createTable('team_presets', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('uuid_generate_v4()'),
          primaryKey: true,
          allowNull: false
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        event_id: {
          type: Sequelize.UUID,
          references: {
            model: 'events',
            key: 'id'
          },
          allowNull: false
        },
        teams_data: {
          type: Sequelize.JSONB,
          allowNull: false
        },
        created_by: {
          type: Sequelize.UUID,
          references: {
            model: 'users',
            key: 'id'
          },
          allowNull: false
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: false
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: false
        }
      });
    },
  
    down: async (queryInterface) => {
      // Drop tables in reverse order to handle foreign key constraints
      await queryInterface.dropTable('team_presets');
      await queryInterface.dropTable('role_change_logs');
      await queryInterface.dropTable('guild_master_transfers');
      await queryInterface.dropTable('gear_submissions');
      await queryInterface.dropTable('gear_checks');
      await queryInterface.dropTable('combat_power_history');
      await queryInterface.dropTable('alliances');
      await queryInterface.dropTable('event_participants');
      await queryInterface.dropTable('event_attendance');
      await queryInterface.dropTable('loot_requests');
      await queryInterface.dropTable('guild_storage_items');
      await queryInterface.dropTable('items');
      await queryInterface.dropTable('team_members');
      await queryInterface.dropTable('teams');
      await queryInterface.dropTable('events');
      await queryInterface.dropTable('local_users');
      await queryInterface.dropTable('users');
    }
  };