// contexts/AuthContext.js
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import debounce from 'lodash/debounce';
import axiosInstance from '../config/axios';
import { Box, CircularProgress } from '@mui/material';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
 const [isAuthenticated, setIsAuthenticated] = useState(false);
 const [user, setUser] = useState(null);
 const [loading, setLoading] = useState(true);

 const checkAuthStatus = useCallback(
   debounce(async () => {
     try {
       const response = await axiosInstance.get('/api/auth/status');
       if (response.data) {
         setUser(response.data);
         setIsAuthenticated(true);
       }
     } catch (error) {
       setIsAuthenticated(false);
       setUser(null);
     } finally {
       setLoading(false);
     }
   }, 1000),
   []
 );

 useEffect(() => {
   checkAuthStatus();
   return () => checkAuthStatus.cancel();
 }, [checkAuthStatus]);

 if (loading) {
   return (
     <Box 
       sx={{ 
         height: '100vh', 
         display: 'flex', 
         alignItems: 'center', 
         justifyContent: 'center',
         background: 'rgba(30, 30, 30, 0.9)'
       }}
     >
       <CircularProgress />
     </Box>
   );
 }

 return (
   <AuthContext.Provider 
     value={{ 
       isAuthenticated, 
       user, 
       checkAuthStatus,
       loading 
     }}
   >
     {children}
   </AuthContext.Provider>
 );
};

export const useAuth = () => useContext(AuthContext);