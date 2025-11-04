// src/pages/DashboardPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import EventForm from '../components/EventForm';
import EventList from '../components/EventList';

function DashboardPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // We wrap fetchEvents in useCallback
  // This "memoizes" the function so it doesn't get recreated on every render
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/events/my-events');
      setEvents(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch events.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // This useEffect runs once when the component mounts
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]); // The dependency array

  if (loading) {
    return <div className="page-container">Loading your events...</div>;
  }

  if (error) {
    return <div className="page-container error">{error}</div>;
  }

  return (
    <div className="page-container dashboard-layout">
      <div className="dashboard-column">
        {/* We pass the 'fetchEvents' function as a prop.
          When the form successfully creates an event, it will call this function.
        */}
        <EventForm onEventCreated={fetchEvents} />
      </div>
      <div className="dashboard-column">
        <EventList events={events} onEventUpdated={fetchEvents} />
      </div>
    </div>
  );
}

export default DashboardPage;