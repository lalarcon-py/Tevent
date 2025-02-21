// frontend/src/contexts/LootContext.js
import { createContext, useContext, useState } from 'react';
import axios from 'axios';

const LootContext = createContext();

export const LootProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);

  const requestItem = async (itemId) => {
    try {
      const response = await axios.post('/api/loot/request', { itemId });
      // Ensure we're adding to an array and handle the response data safely
      const newRequest = response.data || {};
      setRequests(prev => [...prev, newRequest]);
      return newRequest;
    } catch (error) {
      console.error('Error requesting item:', error);
      throw error;
    }
  };

  const loadItems = async () => {
    try {
      const response = await axios.get('/api/items');
      // Ensure we're setting an array
      setItems(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading items:', error);
      setItems([]);
    }
  };

  const loadRequests = async () => {
    try {
      const response = await axios.get('/api/loot/waitlist');
      // Log the response to help debug
      console.log('Waitlist API response:', response.data);
      // Ensure we're setting an array
      setRequests(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading requests:', error);
      setRequests([]);
    }
  };

  return (
    <LootContext.Provider value={{
      items,
      requests,
      requestItem,
      loadItems,
      loadRequests,
      isAdmin: true // Replace with actual auth check
    }}>
      {children}
    </LootContext.Provider>
  );
};

export const useLoot = () => useContext(LootContext);