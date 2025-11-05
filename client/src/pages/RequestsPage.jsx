// src/pages/RequestsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import './RequestsPage.css';
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
  // Ensure we always send a boolean (avoid accidental stringification)
  // Log the outgoing payload for easier debugging in case the server errors
  // (this is a minimal, safe instrumentation change)
  // eslint-disable-next-line no-console
  console.log('Sending swap response', { requestId, acceptance: !!acceptance });
  const resp = await api.post(`/swap/response/${requestId}`, { acceptance: !!acceptance });

  // eslint-disable-next-line no-console
  console.log('Swap response success', resp?.data);
  setMessage(`Request successfully ${action}.`);
  // Await the subsequent refreshes so that any errors surface here and are handled
  await fetchRequests(); // Refetch the lists
  await fetchNotificationCount(); // <-- 3. UPDATE NAVBAR BADGE
    } catch (err) {
      // Log the error for diagnostics and show server message when available
      // (this does not change request logic, only improves error handling)
      // eslint-disable-next-line no-console
      console.error('Error responding to request:', err);
      setError(err.response?.data?.error || 'Failed to respond to request.');
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
            <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Requesting Slot</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {incoming.map((req) => (
                  <tr key={req.swapRequestId}>
                    <td>{req.requesterName}</td>
                    <td>{req.requesterSlotTitle}</td>
                    <td>
                      <span className="time-line">{new Date(req.requesterSlotStartTime).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short', hour12: true })}</span>
                    </td>
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
            </div>
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
            <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
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
                    <td>
                      <span className="time-line">{new Date(req.receiverSlotStartTime).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short', hour12: true })}</span>
                    </td>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RequestsPage;