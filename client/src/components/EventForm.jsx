// src/components/EventForm.jsx
import React, { useState, useRef } from 'react'; // 1. Import useRef
import api from '../api';

function EventForm({ onEventCreated }) {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState('');

  // 2. Create refs
  const startTimeRef = useRef(null);
  const endTimeRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title || !startTime || !endTime) {
      setError('All fields are required.');
      return;
    }
    
    if (new Date(endTime) <= new Date(startTime)) {
      setError('End time must be after the start time.');
      return;
    }

    try {
      // Normalize to ISO timestamps so Postgres TIMESTAMPTZ accepts them reliably
      const payload = {
        title,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      };
      await api.post('/events', payload);
      onEventCreated();

    } catch (err) {
      // Show server-provided error when available to aid debugging
      console.error('Create event error:', err);
      setError(err.response?.data?.error || 'Failed to create event. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="event-form">
      <h2>Create New Event</h2>
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
        {/* 3. Add onClick to the label */}
        <label onClick={() => startTimeRef.current?.showPicker()}>
          Start Time
        </label>
        <input
          type="datetime-local"
          ref={startTimeRef} // 4. Add the ref
          value={startTime}
          onClick={() => startTimeRef.current?.showPicker()}
          onChange={(e) => {
  setError(''); // <-- ADD THIS
  const newStartTime = e.target.value;
  setStartTime(newStartTime);
  if (!endTime || new Date(newStartTime) > new Date(endTime)) {
    setEndTime(newStartTime);
  }
}}
        />
      </div>
      <div>
        {/* 5. Add onClick to the label */}
        <label onClick={() => endTimeRef.current?.showPicker()}>
          End Time
        </label>
        <input
          type="datetime-local"
          ref={endTimeRef} // 6. Add the ref
          value={endTime}
          onClick={() => endTimeRef.current?.showPicker()}
          onChange={(e) => {
  const newEndTime = e.target.value;
  if (!startTime || new Date(newEndTime) >= new Date(startTime)) {
    setEndTime(newEndTime);
    setError(''); // <-- ADD THIS
  } else {
    // Don't set the time, just show the error
    setError('End time must be after the start time.'); // <-- ADD THIS
  }
}}
          min={startTime}
          disabled={!startTime}
        />
      </div>
      <button type="submit" className="btn-primary">Add Event</button>
    </form>
  );
}

export default EventForm;