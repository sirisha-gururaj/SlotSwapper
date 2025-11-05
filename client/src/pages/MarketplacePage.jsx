// src/pages/MarketplacePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import RequestSwapModal from '../components/RequestSwapModal';

function MarketplacePage() {
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // State for the modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  // This holds the slot we clicked "Request Swap" on
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [submitMessage, setSubmitMessage] = useState('');

  // Function to fetch the marketplace slots
  const fetchAvailableSlots = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/swap/swappable-slots');
      setAvailableSlots(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch available slots.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch slots when the page loads
  useEffect(() => {
    fetchAvailableSlots();
  }, [fetchAvailableSlots]);

  useEffect(() => {
    const handleDataRefetch = () => {
      console.log('Real-time: refetchData event received. Refetching marketplace.');
      fetchAvailableSlots();
    };
    
    window.addEventListener('refetchData', handleDataRefetch);
    
    // Cleanup
    return () => {
      window.removeEventListener('refetchData', handleDataRefetch);
    };
  }, [fetchAvailableSlots]); // Add fetchAvailableSlots to the dependency array
  // --- END OF NEW EFFECT ---
  // This is called when we click "Request Swap"
  const handleOpenModal = (slot) => {
    setSelectedSlot(slot);
    setIsModalOpen(true);
    setSubmitMessage(''); // Clear any old messages
  };

  // This is called when we click "Cancel" in the modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSlot(null);
  };

  // This is called when we submit the modal form
  const handleSwapSubmit = async (mySlotId, theirSlotId) => {
    try {
      // Make the API call to request the swap
      await api.post('/swap/request', { mySlotId, theirSlotId });

      setSubmitMessage('Swap request sent successfully!');
      handleCloseModal(); // Close the modal
      fetchAvailableSlots(); // Refetch the list (the slot will be gone)
    } catch (err) {
      setError('Failed to send swap request.');
      handleCloseModal();
    }
  };

  if (loading) {
    return <div className="page-container">Loading available slots...</div>;
  }

  if (error) {
    return <div className="page-container error">{error}</div>;
  }

  return (
    <div className="page-container">
      <h2>Marketplace</h2>
      {submitMessage && <div className="success-message">{submitMessage}</div>}

      <div className="marketplace-list">
        <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Title</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {availableSlots.length === 0 ? (
              <tr>
                <td colSpan="5">No swappable slots available right now.</td>
              </tr>
            ) : (
              availableSlots.map((slot) => (
                <tr key={slot.id}>
                  <td>{slot.ownerName}</td>
                  <td>{slot.title}</td>
                  <td>{new Date(slot.startTime).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short', hour12: true })}</td>
                  <td>{new Date(slot.endTime).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short', hour12: true })}</td>
                  <td>
                    <button
                      className="action-btn"
                      onClick={() => handleOpenModal(slot)}
                    >
                      Request Swap
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>

      {/* The Modal: It only renders if 'isModalOpen' is true */}
      {isModalOpen && (
        <RequestSwapModal
          slotToRequest={selectedSlot}
          onClose={handleCloseModal}
          onSubmit={handleSwapSubmit}
        />
      )}
    </div>
  );
}

export default MarketplacePage;