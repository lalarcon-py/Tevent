// frontend/src/utils/imageUtils.js
/**
 * Formats image paths to absolute URLs for proper display
 * @param {string} imagePath - Relative or absolute image path
 * @returns {string|null} - Formatted image URL or null if no path provided
 */
export const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    // If it's already an absolute URL, return it as is
    if (imagePath.startsWith('http')) return imagePath;
    
    // Otherwise, prepend the API base URL
    const apiBaseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:5000' 
      : process.env.REACT_APP_API_URL || window.location.origin;
      
    return `${apiBaseUrl}${imagePath}`;
  };