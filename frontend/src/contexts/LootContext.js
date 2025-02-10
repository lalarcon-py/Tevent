// contexts/LootContext.js
import { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from '../config/axios';
import { useAuth } from './AuthContext';

const LootContext = createContext();

export const LootProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (mounted && isAuthenticated) {
        await loadItems();
        await loadRequests();
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);

  const requestItem = async (storageItemId) => {
    try {
      const response = await axiosInstance.post('/api/loot/request', {
        storage_item_id: storageItemId
      });
      await loadRequests();
      return response.data;
    } catch (error) {
      console.error('Failed to request item:', error);
      throw error;
    }
   };

  const loadItems = async () => {
    try {
      const response = await axiosInstance.get('/api/items');
      setItems(response.data);
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  };

  const loadRequests = async () => {
    try {
      const response = await axiosInstance.get('/api/loot/waitlist');
      setRequests(response.data);
    } catch (error) {
      console.error('Failed to load requests:', error);
      throw error;
    }
  };

  return (
    <LootContext.Provider value={{
      items,
      requests,
      requestItem,
      loadItems,
      loadRequests,
      loading
    }}>
      {children}
    </LootContext.Provider>
  );
};

export const useLoot = () => useContext(LootContext);