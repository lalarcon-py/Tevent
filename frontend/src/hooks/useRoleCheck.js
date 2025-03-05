
import { useAuth } from '../contexts/AuthContext';

export const useRoleCheck = () => {
  const { user } = useAuth();
  
  const isAdmin = user && ['Guild Master', 'Guild Advisor'].includes(user.role);
  const isGuildMaster = user && user.role === 'Guild Master';
  
  return { isAdmin, isGuildMaster };
};