// src/pages/RequestsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext'; // <-- 1. IMPORT useAuth

function RequestsPage() {
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { fetchNotificationCount } = useAuth(); // <-- 2. GET THE FUNCTION

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setMessage('');
      setError('');

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

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    const handleDataRefetch = () => {
      console.log('Real-time: refetchData event received. Refetching requests.');
      fetchRequests();
    };
    
    // Listen for the global event
    window.addEventListener('refetchData', handleDataRefetch);
    
    // Cleanup
    return () => {
      window.removeEventListener('refetchData', handleDataRefetch);
    };
  }, [fetchRequests]);

  const handleResponse = async (requestId, acceptance) => {
    try {
      const action = acceptance ? 'accepted' : 'rejected';
      await api.post(`/swap/response/${requestId}`, { acceptance });

      setMessage(`Request successfully ${action}.`);
      fetchRequests(); // Refetch the lists
      fetchNotificationCount(); // <-- 3. UPDATE NAVBAR BADGE
    } catch (err) {
      setError('Failed to respond to request.');
    }
  };

  // 4. ADD NEW DISMISS FUNCTION
  const handleDismiss = async (requestId) => {
    try {
      await api.delete(`/swap/request/${requestId}`);
      setMessage('Request dismissed.');
      fetchRequests(); // Refetch the lists
    } catch (err) {
      setError('Failed to dismiss request.');
    }
  };

  if (loading) {
    return <div className="page-container">Loading your requests...</div>;
  }

  return (
    <div className="page-container requests-layout">
      {error && <div className="error">{error}</div>}
      {message && <div className="success-message">{message}</div>}

      {/* INCOMING REQUESTS LIST (No changes here) */}
      <div className="requests-column">
        <h3>Incoming Requests</h3>
        <p>Requests from other users for your slots.</p>
        <div className="requests-list">
          {incoming.length === 0 ? (
            <p>You have no pending incoming requests.</p>
          ) : (
            <table>
              {/* ... table head ... */}
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

      {/* 5. === OUTGOING REQUESTS LIST (THIS IS UPDATED) === */}
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
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {outgoing.map((req) => (
                  <tr key={req.swapRequestId}>
                    <td>{req.receiverName}</td>
                    <td>{req.receiverSlotTitle}</td>
                    <td>{new Date(req.receiverSlotStartTime).toLocaleString()}</td>
                    <td>
  {/* Show different badge based on status */}
  {req.status === 'PENDING' ? (
    <span className="status status-swap_pending">PENDING</span>
  ) : req.status === 'REJECTED' ? (
    <span className="status status-rejected">REJECTED</span>
  ) : (
    <span className="status status-accepted">ACCEPTED</span>
  )}
</td>
<td>
  {/* Show Dismiss button for REJECTED or ACCEPTED */}
  {(req.status === 'REJECTED' || req.status === 'ACCEPTED') && (
    <button
      className="action-btn btn-dismiss"
      onClick={() => handleDismiss(req.swapRequestId)}
    >
      Dismiss
    </button>
  )}
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