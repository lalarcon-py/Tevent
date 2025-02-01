// contexts/AttendanceContext.jsx
import { createContext, useContext, useState } from 'react';

const AttendanceContext = createContext();

export const AttendanceProvider = ({ children }) => {
  const [events, setEvents] = useState([]);
  const [attendance, setAttendance] = useState([]);

  const value = {
    events,
    setEvents,
    attendance,
    setAttendance
  };

  return (
    <AttendanceContext.Provider value={value}>
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
};