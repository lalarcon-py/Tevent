// src/components/Billing/BillingHistory.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Button
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import axiosInstance from '../../config/axios';

const BillingHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchBillingHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axiosInstance.get('/api/billing/history');
        setTransactions(response.data.transactions);
      } catch (error) {
        console.error('Failed to fetch billing history:', error);
        setError('Failed to load billing history');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBillingHistory();
  }, []);
  
  const handleDownloadInvoice = async (invoiceId) => {
    try {
      const response = await axiosInstance.get(`/api/billing/invoice/${invoiceId}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download invoice:', error);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error">
        {error}
      </Typography>
    );
  }

  if (!transactions.length) {
    return (
      <Typography color="text.secondary">
        No billing history found.
      </Typography>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Amount</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Invoice</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>
                {new Date(transaction.date).toLocaleDateString()}
              </TableCell>
              <TableCell>{transaction.description}</TableCell>
              <TableCell>${transaction.amount.toFixed(2)}</TableCell>
              <TableCell>
                <Box sx={{ 
                  display: 'inline-block', 
                  px: 1, 
                  py: 0.5, 
                  borderRadius: 1, 
                  bgcolor: transaction.status === 'succeeded' ? 'success.light' : 'warning.light',
                  color: transaction.status === 'succeeded' ? 'success.contrastText' : 'warning.contrastText'
                }}>
                  {transaction.status === 'succeeded' ? 'Paid' : 'Pending'}
                </Box>
              </TableCell>
              <TableCell>
                <Button
                  startIcon={<DownloadIcon />}
                  size="small"
                  onClick={() => handleDownloadInvoice(transaction.invoiceId)}
                >
                  PDF
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default BillingHistory;