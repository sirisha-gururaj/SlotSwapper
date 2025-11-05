// src/components/RequestSwapModal.jsx
import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
// 'slotToRequest' is the slot the user wants (from the marketplace)
// 'onClose' is a function to close the modal
// 'onSubmit' is a function to handle the final swap request
function RequestSwapModal({ slotToRequest, onClose, onSubmit }) {
  const [mySwappableSlots, setMySwappableSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // When the modal opens, fetch the user's OWN swappable slots
  useEffect(() => {
    const fetchMySlots = async () => {
      try {
        const response = await api.get('/events/my-events');
        // Filter for slots that are 'SWAPPABLE'
        const swappable = response.data.filter(
          (event) => event.status === 'SWAPPABLE'
        );
        setMySwappableSlots(swappable);

        // Auto-select the first one if available
        if (swappable.length > 0) {
          setSelectedSlotId(swappable[0].id);
        }
      } catch (err) {
        setError('Failed to load your swappable slots.');
      } finally {
        setLoading(false);
      }
    };

    fetchMySlots();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedSlotId) {
      setError('Please select one of your slots to offer.');
      return;
    }
    // Call the submit function passed in props
    onSubmit(selectedSlotId, slotToRequest.id);
  };

  const handleGoToDashboard = () => {
    onClose(); // Close the modal first
    navigate('/'); // Then go to the dashboard
  };
  return (
    // The modal background overlay
    <div className="modal-overlay" onClick={onClose}>
      {/* The modal content, stops click from closing */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* --- 4. ADD CLOSE 'X' BUTTON --- */}
        <button className="modal-close-btn" onClick={onClose}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {/* --- END OF 'X' BUTTON --- */}
        <h2>Request a Swap</h2>
        <p>
          You are requesting <strong>{slotToRequest.title}</strong> from{' '}
          <strong>{slotToRequest.ownerName}</strong>.
        </p>
        <p>
          Which of your swappable slots would you like to offer?
        </p>

        {loading && <p>Loading your slots...</p>}
        {error && <p className="error">{error}</p>}

        <form onSubmit={handleSubmit}>
          {mySwappableSlots.length > 0 ? (
            <>
              <select
                value={selectedSlotId}
                onChange={(e) => setSelectedSlotId(e.target.value)}
              >
                {mySwappableSlots.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.title} ({new Date(slot.startTime).toLocaleString()})
                  </option>
                ))}
              </select>
              <div className="modal-actions">
                <button type="button" onClick={onClose} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Send Request
                </button>
              </div>
            </>
          ) : (
            !loading && (
              <div className="no-slots-message">
                <p>
                  You have no swappable slots to offer. Go to your Dashboard to make a
                  slot swappable.
                </p>
                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={handleGoToDashboard}
                >
                  Go to Dashboard
                </button>
              </div>
            )
          )}
        </form>
      </div>
    </div>
  );
}

export default RequestSwapModal;