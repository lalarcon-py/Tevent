import { Button } from '@mui/material';
import React, { useState } from 'react';

const GearCheckButton = () => {
  const [image, setImage] = useState(null);
  const [output, setOutput] = useState(null);

  // Handle image upload
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImage(file);
    }
  };

  // Handle paste event
  const handlePaste = (event) => {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    for (let item of items) {
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        setImage(blob);
      }
    }
  };

  // Send image to backend and get the parsed stats
  const handleGearCheck = async () => {
    if (!image) {
      alert('Please upload or paste an image first.');
      return;
    }

    const formData = new FormData();
    formData.append('image', image);

    try {
      const response = await fetch('/api/parse-gear', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setOutput(data);
      } else {
        alert('Failed to parse the image. Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while processing the image.');
    }
  };

  return (
    <div>
      {/* Hidden input for image upload */}
      <input
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        id="upload-image"
        onChange={handleImageUpload}
      />
      <label htmlFor="upload-image">
        <Button
          variant="contained"
          component="span"
          sx={{
            bgcolor: '#f48fb1',
            color: '#1a1a1a',
            fontWeight: 'bold',
            px: 4,
            py: 1.5,
            borderRadius: '8px',
            '&:hover': {
              bgcolor: '#ec407a',
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 15px rgba(244, 143, 177, 0.4)',
            },
            transition: 'all 0.3s ease',
            mr: 2,
          }}
        >
          Upload Image
        </Button>
      </label>

      <Button
        variant="contained"
        onClick={handleGearCheck}
        sx={{
          bgcolor: '#f48fb1',
          color: '#1a1a1a',
          fontWeight: 'bold',
          px: 4,
          py: 1.5,
          borderRadius: '8px',
          '&:hover': {
            bgcolor: '#ec407a',
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 15px rgba(244, 143, 177, 0.4)',
          },
          transition: 'all 0.3s ease',
        }}
      >
        Gear Check
      </Button>

      {/* Listen for paste event */}
      <div
        onPaste={handlePaste}
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%' }}
      ></div>

      {/* Display parsed stats */}
      {output && (
        <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ccc', borderRadius: '8px' }}>
          <h3>Character Details</h3>
          <p><strong>Character Name:</strong> {output.characterName}</p>
          <p><strong>Combat Power:</strong> {output.combatPower}</p>
          <p><strong>Stats:</strong></p>
          <ul>
            {output.stats.map((stat, index) => (
              <li key={index}>{stat}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default GearCheckButton;