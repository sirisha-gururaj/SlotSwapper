// src/pages/DashboardPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import EventForm from '../components/EventForm';
import EventList from '../components/EventList';
import EditEventModal from '../components/EditEventModal';

function DashboardPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // --- NEW STATE FOR ADD MODAL ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState(null);

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

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]); 

  const handleOpenEditModal = (event) => {
    setEventToEdit(event);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEventToEdit(null);
    setIsEditModalOpen(false);
  };
  
  // --- HELPER TO CLOSE ADD MODAL ---
  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
  };

  if (loading) {
    return <div className="page-container">Loading your events...</div>;
  }

  if (error) {
    return <div className="page-container error">{error}</div>;
  }

  return (
    <>
      <div className="page-container">
        <div className="dashboard-header">
          <div>
            <h2>Welcome, {user?.name}!</h2>
            <p>Manage your events and make them available for swapping.</p>
          </div>
          <button className="btn-primary" onClick={() => setIsAddModalOpen(true)}>
            + Add Event
          </button>
        </div>

        <EventList 
          events={events} 
          onEventUpdated={fetchEvents}
          onEditClick={handleOpenEditModal} 
        />
      </div>
      
      {/* --- MODALS ARE MOVED OUTSIDE --- */}
      {/* This makes them center on the *whole screen* */}
      
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={handleCloseAddModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <EventForm 
              onEventCreated={() => {
                fetchEvents();
                handleCloseAddModal();
              }} 
            />
          </div>
        </div>
      )}
      
      {isEditModalOpen && (
        <EditEventModal
          eventToEdit={eventToEdit}
          onClose={handleCloseEditModal}
          onEventUpdated={() => {
            fetchEvents();
            handleCloseEditModal();
          }}
        />
      )}
    </>
  );
}

export default DashboardPage;