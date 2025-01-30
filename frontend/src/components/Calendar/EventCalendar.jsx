// frontend/src/components/Calendar/EventCalendar.jsx
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

const EventCalendar = ({ events }) => {
  return (
    <Paper sx={{ p: 2, mt: 4, height: 600 }}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 500 }}
        eventPropGetter={(event) => ({
          style: {
            backgroundColor: event.type === 'raid' ? '#f48fb1' : '#90caf9',
          }
        })}
      />
    </Paper>
  );
};