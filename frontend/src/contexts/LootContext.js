// frontend/src/contexts/LootContext.js
import { createContext, useContext, useState } from 'react';
import axios from 'axios';

const LootContext = createContext();

export const LootProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);

  const requestItem = async (itemId) => {
    const response = await axios.post('/api/loot/request', { itemId });
    setRequests([...requests, response.data]);
  };

  const loadItems = async () => {
    const response = await axios.get('/api/items');
    setItems(response.data);
  };

  const loadRequests = async () => {
    const response = await axios.get('/api/loot/waitlist');
    setRequests(response.data);
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