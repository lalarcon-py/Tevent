/**
 * Migration to create discord_role_ping_config table
 */

exports.up = async function(knex) {
  // Check if the table already exists
  const exists = await knex.schema.hasTable('discord_role_ping_config');
  
  if (!exists) {
    return knex.schema.createTable('discord_role_ping_config', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('guild_id').notNullable();
      table.string('type', 50).notNullable().comment('Type of notification: events, storage, etc.');
      table.specificType('role_ids', 'TEXT[]').notNullable().defaultTo('{}');
      table.boolean('enabled').notNullable().defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Add unique constraint for guild_id and type
      table.unique(['guild_id', 'type']);
      
      // Add foreign key constraint
      table.foreign('guild_id').references('id').inTable('guilds').onDelete('CASCADE');
    });
  }
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('discord_role_ping_config');
};
