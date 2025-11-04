// src/components/EventList.jsx
import React from 'react';
import api from '../api';

// We pass the list of events and a function to refetch
function EventList({ events, onEventUpdated }) {

  const handleStatusChange = async (event, newStatus) => {
    try {
      await api.patch(`/events/${event.id}/status`, { status: newStatus });
      // Tell the parent to refetch
      onEventUpdated();
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  return (
    <div className="event-list">
      <h3>My Events</h3>
      {events.length === 0 ? (
        <p>You have no events. Create one to get started!</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>{event.title}</td>
                {/* We format the date string to be more readable */}
                <td>{new Date(event.startTime).toLocaleString()}</td>
                <td>{new Date(event.endTime).toLocaleString()}</td>
                <td>
                  <span className={`status status-${event.status.toLowerCase()}`}>
                    {event.status}
                  </span>
                </td>
                <td>
                  {/* Show the correct button based on the event's status */}
                  {event.status === 'BUSY' && (
                    <button
                      className="action-btn"
                      onClick={() => handleStatusChange(event, 'SWAPPABLE')}
                    >
                      Make Swappable
                    </button>
                  )}
                  {event.status === 'SWAPPABLE' && (
                    <button
                      className="action-btn action-btn-secondary"
                      onClick={() => handleStatusChange(event, 'BUSY')}
                    >
                      Make Busy
                    </button>
                  )}
                  {event.status === 'SWAP_PENDING' && (
                    <button className="action-btn" disabled>
                      Pending...
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default EventList;