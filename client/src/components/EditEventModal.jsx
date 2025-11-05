// src/components/EditEventModal.jsx
import React, { useState, useEffect, useRef } from 'react'; // 1. Import useRef
import api from '../api';

function EditEventModal({ eventToEdit, onClose, onEventUpdated }) {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState('');

  // 2. Create refs
  const startTimeRef = useRef(null);
  const endTimeRef = useRef(null);

  useEffect(() => {
    if (eventToEdit) {
      setTitle(eventToEdit.title);
      setStartTime(formatDateForInput(eventToEdit.startTime));
      setEndTime(formatDateForInput(eventToEdit.endTime));
    }
  }, [eventToEdit]);

  const formatDateForInput = (isoDate) => {
    if (!isoDate) return '';
    const d = new Date(isoDate);
    return d.toISOString().slice(0, 16);
  };

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
      await api.put(`/events/${eventToEdit.id}`, { 
        title, 
        startTime, 
        endTime 
      });
      onEventUpdated();
      onClose();
    } catch (err) {
      setError('Failed to update event. Please try again.');
      console.error(err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Edit Event</h2>
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