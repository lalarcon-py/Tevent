import { useState } from 'react';
import { Button, Typography, Paper } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const GearSubmission = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        const file = event.target.image.files[0];
        if (!file) {
            alert('Please select an image to upload.');
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await fetch('/api/gear/submit', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                alert('Gear submission successful!');
            } else {
                const data = await response.json();
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error('Error submitting gear:', error);
            alert('An error occurred while submitting your gear.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Paper sx={{ p: 4, bgcolor: 'rgba(30, 30, 30, 0.7)' }}>
            <Typography variant="h4" gutterBottom sx={{ color: '#90caf9' }}>
                Submit Your Gear
            </Typography>
            <form onSubmit={handleSubmit}>
                <input
                    type="file"
                    name="image"
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="gear-upload"
                />
                <label htmlFor="gear-upload">
                    <Button
                        variant="contained"
                        component="span"
                        startIcon={<CloudUploadIcon />}
                        disabled={isSubmitting}
                        sx={{
                            bgcolor: '#f48fb1',
                            '&:hover': { bgcolor: '#ec407a' },
                            fontSize: '1.1rem',
                            px: 4,
                            py: 1.5,
                        }}
                    >
                        {isSubmitting ? 'Uploading...' : 'Upload Screenshot'}
                    </Button>
                </label>
            </form>
        </Paper>
    );
};

export default GearSubmission;