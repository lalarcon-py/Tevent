// backend/utils/helpers.js
/**
 * Validates if a string is a valid UUID
 * @param {string} uuid - String to validate as UUID
 * @returns {boolean} True if valid UUID, false otherwise
 */
function validateUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
  
  module.exports = {
    validateUUID
  };