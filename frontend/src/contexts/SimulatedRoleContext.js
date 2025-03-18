// src/contexts/SimulatedRoleContext.js
import React, { createContext, useState, useContext } from 'react';

const SimulatedRoleContext = createContext();

export const SimulatedRoleProvider = ({ children }) => {
  const [simulatedRole, setSimulatedRole] = useState(null);
  
  // Helper function to clear simulation
  const clearSimulation = () => setSimulatedRole(null);
  
  return (
    <SimulatedRoleContext.Provider value={{ 
      simulatedRole, 
      setSimulatedRole,
      clearSimulation,
      isSimulating: simulatedRole !== null
    }}>
      {children}
    </SimulatedRoleContext.Provider>
  );
};

export const useSimulatedRole = () => {
  const context = useContext(SimulatedRoleContext);
  if (!context) {
    throw new Error('useSimulatedRole must be used within a SimulatedRoleProvider');
  }
  return context;
};