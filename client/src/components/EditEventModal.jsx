// src/components/EditEventModal.jsx
import React, { useState, useEffect } from 'react';
import api from '../api';

// 'eventToEdit' is the event object we pass in
// 'onClose' and 'onEventUpdated' are functions
function EditEventModal({ eventToEdit, onClose, onEventUpdated }) {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState('');

  // When the component loads, pre-fill the form with the event's data
  useEffect(() => {
    if (eventToEdit) {
      setTitle(eventToEdit.title);
      // We need to format the ISO date string to "datetime-local" format
      setStartTime(formatDateForInput(eventToEdit.startTime));
      setEndTime(formatDateForInput(eventToEdit.endTime));
    }
  }, [eventToEdit]);

  // Helper function to convert "2025-11-10T10:00:00Z" to "2025-11-10T10:00"
  const formatDateForInput = (isoDate) => {
    if (!isoDate) return '';
    const d = new Date(isoDate);
    // Slices off the seconds and 'Z'
    return d.toISOString().slice(0, 16);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title || !startTime || !endTime) {
      setError('All fields are required.');
      return;
    }

    try {
      // Call the PUT endpoint we created
      await api.put(`/events/${eventToEdit.id}`, { 
        title, 
        startTime, 
        endTime 
      });

      onEventUpdated(); // Tell the dashboard to refetch events
      onClose(); // Close this modal

    } catch (err) {
      setError('Failed to update event. Please try again.');
      console.error(err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Edit Event</h2>
        {/* This form is just like EventForm, but for editing */}
        <form onSubmit={handleSubmit} className="event-form">
          {error && <p className="error">{error}</p>}
          <div>
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label>Start Time</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div>
            <label>End Time</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditEventModal;