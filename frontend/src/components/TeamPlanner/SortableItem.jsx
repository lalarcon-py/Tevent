// src/components/TeamPlanner/SortableItem.jsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Paper, Typography } from '@mui/material';

export const SortableItem = ({ id, teamId, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ 
    id,
    data: {
      teamId,
      type: 'member'
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Paper
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      sx={{ 
        p: 1, 
        mb: 1, 
        bgcolor: '#2d2d2d',
        cursor: 'grab',
        '&:active': {
          cursor: 'grabbing'
        },
        '&:hover': { 
          bgcolor: '#3d3d3d' 
        },
        ...style
      }}
    >
      {children}
    </Paper>
  );
};