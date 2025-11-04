// src/pages/RequestsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';

function RequestsPage() {
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Function to fetch *both* lists
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setMessage('');
      setError('');

      // Use Promise.all to fetch both endpoints at the same time
      const [incomingRes, outgoingRes] = await Promise.all([
        api.get('/swap/requests/incoming'),
        api.get('/swap/requests/outgoing')
      ]);

      setIncoming(incomingRes.data);
      setOutgoing(outgoingRes.data);

    } catch (err) {
      setError('Failed to fetch requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch requests when the page loads
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // This is called when we click "Accept" or "Reject"
  const handleResponse = async (requestId, acceptance) => {
    try {
      const action = acceptance ? 'accepted' : 'rejected';
      // Call the response endpoint we made earlier
      await api.post(`/swap/response/${requestId}`, { acceptance });

      setMessage(`Request successfully ${action}.`);
      // Refetch the lists, as this request will disappear
      fetchRequests();
    } catch (err) {
      setError('Failed to respond to request.');
    }
  };

  if (loading) {
    return <div className="page-container">Loading your requests...</div>;
  }

  return (
    <div className="page-container requests-layout">
      {error && <div className="error">{error}</div>}
      {message && <div className="success-message">{message}</div>}

      {/* INCOMING REQUESTS LIST */}
      <div className="requests-column">
        <h3>Incoming Requests</h3>
        <p>Requests from other users for your slots.</p>
        <div className="requests-list">
          {incoming.length === 0 ? (
            <p>You have no pending incoming requests.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Offering Slot</th>
                  <th>Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {incoming.map((req) => (
                  <tr key={req.swapRequestId}>
                    <td>{req.requesterName}</td>
                    <td>{req.requesterSlotTitle}</td>
                    <td>{new Date(req.requesterSlotStartTime).toLocaleString()}</td>
                    <td>
                      <button 
                        className="action-btn btn-accept"
                        onClick={() => handleResponse(req.swapRequestId, true)}
                      >
                        Accept
                      </button>
                      <button 
                        className="action-btn btn-reject"
                        onClick={() => handleResponse(req.swapRequestId, false)}
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* OUTGOING REQUESTS LIST */}
      <div className="requests-column">
        <h3>Outgoing Requests</h3>
        <p>Your pending requests to other users.</p>
        <div className="requests-list">
          {outgoing.length === 0 ? (
            <p>You have no pending outgoing requests.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Requesting Slot</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {outgoing.map((req) => (
                  <tr key={req.swapRequestId}>
                    <td>{req.receiverName}</td>
                    <td>{req.receiverSlotTitle}</td>
                    <td>{new Date(req.receiverSlotStartTime).toLocaleString()}</td>
                    <td>
                      <span className="status status-swap_pending">
                        PENDING
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default RequestsPage;