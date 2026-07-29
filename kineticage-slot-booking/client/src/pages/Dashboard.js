import React, { useEffect, useState } from 'react';
import api from '../api/axios';

function BookingRow({ booking, onCancel }) {
  const start = new Date(booking.slot.startTime);
  return (
    <div className="booking-row">
      <div>
        <strong>{booking.service.name}</strong>
        <div className="muted">
          {start.toLocaleString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </div>
      </div>
      <div className="booking-tags">
        <span className={`tag status-${booking.status}`}>{booking.status}</span>
        <span className="tag">{booking.paymentMethod === 'cod' ? 'COD' : 'Prepaid'}</span>
        <span className="tag">{booking.paymentStatus}</span>
      </div>
      {booking.status === 'confirmed' && start > new Date() && (
        <button className="btn-link danger" onClick={() => onCancel(booking._id)}>
          Cancel
        </button>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api
      .get('/bookings/me')
      .then((res) => {
        setUpcoming(res.data.upcoming);
        setPast(res.data.past);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCancel = async (id) => {
    setError('');
    try {
      await api.patch(`/bookings/${id}/cancel`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not cancel booking');
    }
  };

  if (loading) return <div className="page-loading">Loading your bookings...</div>;

  return (
    <div className="page">
      <h1>My Bookings</h1>
      {error && <div className="error-text">{error}</div>}

      <h3>Upcoming</h3>
      {upcoming.length === 0 && <p className="muted">No upcoming bookings.</p>}
      {upcoming.map((b) => (
        <BookingRow key={b._id} booking={b} onCancel={handleCancel} />
      ))}

      <h3>Past &amp; Cancelled</h3>
      {past.length === 0 && <p className="muted">Nothing here yet.</p>}
      {past.map((b) => (
        <BookingRow key={b._id} booking={b} onCancel={handleCancel} />
      ))}
    </div>
  );
}
