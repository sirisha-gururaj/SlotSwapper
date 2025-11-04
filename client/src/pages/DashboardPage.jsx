// src/pages/DashboardPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import EventForm from '../components/EventForm';
import EventList from '../components/EventList';
import { useAuth } from '../context/AuthContext';

function DashboardPage() {
  const { user } = useAuth();
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
    <div className="page-container">
      <div className="dashboard-header">
        <h2>Welcome, {user?.name}!</h2>
        <p>Manage your events and make them available for swapping.</p>
      </div>
      <div className="dashboard-layout">
        <div className="dashboard-column">
          <EventForm onEventCreated={fetchEvents} />
        </div>
        <div className="dashboard-column">
          <EventList events={events} onEventUpdated={fetchEvents} />
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;