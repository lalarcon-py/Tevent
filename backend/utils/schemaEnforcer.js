// backend/utils/schemaEnforcer.js
const { Sequelize } = require('sequelize');

class SchemaEnforcer {
  /**
   * Adds schema enforcement to Sequelize models and queries
   * @param {Sequelize} sequelize - Sequelize instance
   */
  static applyToSequelize(sequelize) {
    // Add hook to enforce schema on all queries
    sequelize.addHook('beforeQuery', (options) => {
      // Set schema name from connection configuration or options
      const schemaName = options.schema || sequelize.options.schema || 'public';
      
      // Modify SQL to use fully qualified table names
      if (options.sql && !options.sql.includes('CREATE SCHEMA') && !options.sql.includes('information_schema')) {
        // Ensure we haven't already applied schema qualification
        if (!options._schemaEnforcerApplied) {
          // Force schema qualification for all table references
          options._schemaEnforcerApplied = true;
          
          // Track modifications for debugging
          const originalSql = options.sql;
          
          // Replace unqualified table names with fully qualified ones
          // This is a simple approach - more complex SQL would need a proper SQL parser
          options.sql = options.sql.replace(
            /(FROM|JOIN|UPDATE|INTO|ALTER TABLE|CREATE TABLE|DROP TABLE) ([\w_"]+)/gi,
            (match, operation, tableName) => {
              // Skip if already qualified or if it's a special table
              if (tableName.includes('.') || tableName.includes('pg_') || tableName.includes('information_schema')) {
                return match;
              }
              return `${operation} "${schemaName}".${tableName}`;
            }
          );
          
          console.log(`[SchemaEnforcer] Modified query to use schema "${schemaName}"`);
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`[SchemaEnforcer] Original SQL: ${originalSql}`);
            console.log(`[SchemaEnforcer] Modified SQL: ${options.sql}`);
          }
        }
      }
    });
    
    // Add method to models to explicitly set schema
    sequelize.Model.prototype.setSchema = function(schema) {
      this.options.schema = schema;
      return this;
    };
    
    console.log('[SchemaEnforcer] Applied schema enforcement to Sequelize');
  }
  
  /**
   * Forces schema qualification for a specific query options object
   * @param {Object} options - Sequelize query options
   * @param {string} schema - Schema name to use
   */
  static enforceSchema(options, schema) {
    options.schema = schema;
    return options;
  }
  
  /**
   * Wraps a model method to ensure schema is set
   * @param {Function} method - Model method to wrap
   * @param {string} schema - Schema name to use
   */
  static wrapModelMethod(method, schema) {
    return function(...args) {
      // Get options object (usually last argument)
      const options = args[args.length - 1] || {};
      
      // Set schema in options
      options.schema = schema;
      
      // Replace last argument with modified options
      args[args.length - 1] = options;
      
      // Call original method
      return method.apply(this, args);
    };
  }
}

module.exports = SchemaEnforcer;