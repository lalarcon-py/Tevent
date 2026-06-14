// frontend/src/utils/imageUtils.js
import API_URL from '../config/apiUrl';

export const getImageUrl = (imagePath) => {
    if (!imagePath) return null;

    // Check for absolute url
    if (imagePath.startsWith('http')) return imagePath;

    // Otherwise, prepend the API base URL
    return `${API_URL}${imagePath}`;
  };