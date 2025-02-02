import { useState, useEffect } from 'react';
import { Button, Typography, Paper, List, ListItem, ListItemText } from '@mui/material';

const GearReview = () => {
    const [submissions, setSubmissions] = useState([]);

    useEffect(() => {
        fetchPendingSubmissions();
    }, []);

    const fetchPendingSubmissions = async () => {
        try {
            const response = await fetch('/api/gear/pending');
            const data = await response.json();
            setSubmissions(data);
        } catch (error) {
            console.error('Error fetching pending submissions:', error);
        }
    };

    const handleReview = async (id, status) => {
        try {
            await fetch(`/api/gear/review/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            fetchPendingSubmissions(); // Refresh the list
        } catch (error) {
            console.error('Error reviewing submission:', error);
        }
    };

    return (
        <Paper sx={{ p: 4, bgcolor: 'rgba(30, 30, 30, 0.7)' }}>
            <Typography variant="h4" gutterBottom sx={{ color: '#90caf9' }}>
                Pending Gear Submissions
            </Typography>
            <List>
                {submissions.map((submission) => (
                    <ListItem key={submission.id} sx={{ bgcolor: '#1a1a1a', mb: 2 }}>
                        <ListItemText
                            primary={`Submitted by: ${submission.submitted_by}`}
                            secondary={
                                <>
                                    <img src={submission.image_url} alt="Gear" style={{ maxWidth: '200px' }} />
                                    <div>
                                        <Button
                                            onClick={() => handleReview(submission.id, 'approved')}
                                            variant="contained"
                                            color="success"
                                            sx={{ mr: 2 }}
                                        >
                                            Approve
                                        </Button>
                                        <Button
                                            onClick={() => handleReview(submission.id, 'rejected')}
                                            variant="contained"
                                            color="error"
                                        >
                                            Reject
                                        </Button>
                                    </div>
                                </>
                            }
                        />
                    </ListItem>
                ))}
            </List>
        </Paper>
    );
};

export default GearReview;