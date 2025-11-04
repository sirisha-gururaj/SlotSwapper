// src/components/EventForm.jsx
import React, { useState } from 'react';
import api from '../api';

// We pass 'onEventCreated' as a prop
// This lets us "lift state up" and tell the parent page to refetch
function EventForm({ onEventCreated }) {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (!title || !startTime || !endTime) {
      setError('All fields are required.');
      return;
    }

    try {
      // Use the 'api' helper we made
      await api.post('/events', { title, startTime, endTime });

      // Clear the form
      setTitle('');
      setStartTime('');
      setEndTime('');

      // Call the function from props to tell the Dashboard to refetch
      onEventCreated();

    } catch (err) {
      setError('Failed to create event. Please try again.');
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="event-form">
      <h3>Create New Event</h3>
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
          type="datetime-local" // HTML5 input for date and time
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
      <button type="submit">Add Event</button>
    </form>
  );
}

export default EventForm;