// components/Header/BillingMenu.jsx
import { useState } from 'react';
import {
  Menu, MenuItem, Divider, Typography, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, TextField, Box,
  ListItemIcon, ListItemText, List, ListItem, Card, CardContent,
  FormControl, FormLabel, RadioGroup, FormControlLabel, Radio
} from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import HistoryIcon from '@mui/icons-material/History';

const BillingMenu = ({ anchorEl, open, handleClose }) => {
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [openInvoicesDialog, setOpenInvoicesDialog] = useState(false);
  
  // Sample data (replace with actual data fetching)
  const invoices = [
    { id: '1234', date: '2024-02-15', amount: '$9.99', status: 'Paid' },
    { id: '1235', date: '2024-01-15', amount: '$9.99', status: 'Paid' },
    { id: '1236', date: '2023-12-15', amount: '$9.99', status: 'Paid' },
  ];
  
  const handlePaymentDialogOpen = () => {
    setOpenPaymentDialog(true);
    handleClose();
  };
  
  const handleInvoicesDialogOpen = () => {
    setOpenInvoicesDialog(true);
    handleClose();
  };
  
  const handlePaymentSubmit = async () => {
    // Payment method update logic
    setOpenPaymentDialog(false);
  };
  
  return (
    <>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 240,
            maxWidth: '100%',
            mt: 1.5,
            bgcolor: '#1e1e1e',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'white' }}>
            Billing & Subscription
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Pro Plan - $9.99/month
          </Typography>
        </Box>
        
        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />
        
        <MenuItem onClick={handlePaymentDialogOpen} sx={{ color: 'white' }}>
          <ListItemIcon>
            <CreditCardIcon fontSize="small" sx={{ color: '#90caf9' }} />
          </ListItemIcon>
          <ListItemText>Update Payment Method</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleInvoicesDialogOpen} sx={{ color: 'white' }}>
          <ListItemIcon>
            <HistoryIcon fontSize="small" sx={{ color: '#90caf9' }} />
          </ListItemIcon>
          <ListItemText>View Invoices</ListItemText>
        </MenuItem>
      </Menu>
      
      {/* Payment Method Dialog */}
      <Dialog 
        open={openPaymentDialog} 
        onClose={() => setOpenPaymentDialog(false)}
        PaperProps={{
          sx: { bgcolor: '#1e1e1e', color: 'white' }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Update Payment Method</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 3 }}>
            Your subscription will be charged to the selected payment method.
          </Typography>
          
          <FormControl component="fieldset" sx={{ width: '100%' }}>
            <FormLabel component="legend" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Select Payment Method
            </FormLabel>
            <RadioGroup defaultValue="card" sx={{ mb: 3 }}>
              <FormControlLabel 
                value="card" 
                control={<Radio sx={{ color: '#90caf9' }} />} 
                label="Credit/Debit Card" 
                sx={{ color: 'white' }}
              />
            </RadioGroup>
          </FormControl>
          
          <Box sx={{ mb: 2 }}>
            <TextField
              label="Card Number"
              fullWidth
              margin="dense"
              placeholder="XXXX XXXX XXXX XXXX"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                },
                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' }
              }}
            />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="Expiration Date"
              placeholder="MM/YY"
              sx={{
                flexGrow: 1,
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                },
                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' }
              }}
            />
            <TextField
              label="CVV"
              placeholder="123"
              sx={{
                width: '80px',
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                },
                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' }
              }}
            />
          </Box>
          
          <TextField
            label="Name on Card"
            fullWidth
            margin="dense"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
              },
              '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPaymentDialog(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handlePaymentSubmit} variant="contained" color="primary">
            Save Payment Method
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Invoices Dialog */}
      <Dialog 
        open={openInvoicesDialog} 
        onClose={() => setOpenInvoicesDialog(false)}
        PaperProps={{
          sx: { bgcolor: '#1e1e1e', color: 'white' }
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Billing History</DialogTitle>
        <DialogContent>
          <List>
            {invoices.map(invoice => (
              <ListItem key={invoice.id} disableGutters>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    width: '100%', 
                    bgcolor: 'rgba(30, 30, 30, 0.6)',
                    borderColor: 'rgba(255, 255, 255, 0.12)'
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography color="white" variant="subtitle1">
                          Pro Plan Subscription
                        </Typography>
                        <Typography color="rgba(255, 255, 255, 0.7)" variant="body2">
                          Invoice #{invoice.id} • {new Date(invoice.date).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography color="white" variant="subtitle1">
                          {invoice.amount}
                        </Typography>
                        <Typography 
                          color={invoice.status === 'Paid' ? '#4caf50' : '#f44336'} 
                          variant="body2"
                        >
                          {invoice.status}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button 
                        size="small" 
                        startIcon={<ReceiptIcon />}
                        sx={{ color: '#90caf9' }}
                      >
                        Download PDF
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenInvoicesDialog(false)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BillingMenu;