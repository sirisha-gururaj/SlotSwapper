// src/components/EventList.jsx
import React from 'react';
import api from '../api';

// We pass the list of events and a function to refetch
function EventList({ events, onEventUpdated, onEditClick}) {

  const handleStatusChange = async (event, newStatus) => {
    try {
      await api.patch(`/events/${event.id}/status`, { status: newStatus });
      // Tell the parent to refetch
      onEventUpdated();
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };
  const handleDelete = async (eventId) => {
    // Ask for confirmation
    if (window.confirm("Are you sure you want to delete this event?")) {
      try {
        await api.delete(`/events/${eventId}`);
        // Tell the parent to refetch
        onEventUpdated();
      } catch (err) {
        console.error("Error deleting event:", err);
        // You could show an error to the user here
        alert("Error deleting event. It might be in a pending swap.");
      }
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
              <th style={{ width: '150px' }}>Action</th> {/* Combined Actions */}
            </tr>
          </thead>
          
<tbody>
  {events.map((event) => (
    <tr key={event.id}>
      <td>{event.title}</td>
      <td>{new Date(event.startTime).toLocaleString()}</td>
      <td>{new Date(event.endTime).toLocaleString()}</td>
      <td>
        <span className={`status status-${event.status.toLowerCase()}`}>
          {event.status}
        </span>
      </td>

      <td className="action-cell">
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

        {/* === ICONS ARE NOW SVGs === */}
        {event.status !== 'SWAP_PENDING' && (
          <div className="icon-buttons">
            <button 
              className="icon-btn"
              title="Edit Event"
              onClick={() => onEditClick(event)}
            >
              {/* Blue Edit Icon */}
              <svg className="icon-svg icon-edit" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
              </svg>
            </button>
            <button 
              className="icon-btn"
              title="Delete Event"
              onClick={() => handleDelete(event.id)}
            >
              {/* Red Delete Icon */}
              <svg className="icon-svg icon-delete" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
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