// frontend/src/utils/imageUtils.js

export const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    // Check for absolute url
    if (imagePath.startsWith('http')) return imagePath;
    
    // Otherwise, prepend the API base URL
    const apiBaseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:5000' 
      : process.env.REACT_APP_API_URL || window.location.origin;
      
    return `${apiBaseUrl}${imagePath}`;
  };