import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import SlotCard from '../components/SlotCard';

export default function Booking() {
  const { serviceId } = useParams();
  const [service, setService] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const loadSlots = () => {
    setLoading(true);
    api
      .get('/slots', { params: { serviceId } })
      .then((res) => {
        setService(res.data.service);
        setSlots(res.data.slots);
      })
      .catch(() => setError('Could not load slots'))
      .finally(() => setLoading(false));
  };

  useEffect(loadSlots, [serviceId]);

  // Group slots by calendar day for a clean "next 3 days" view.
  const slotsByDay = slots.reduce((acc, slot) => {
    const day = new Date(slot.startTime).toDateString();
    acc[day] = acc[day] || [];
    acc[day].push(slot);
    return acc;
  }, {});

  const handleConfirm = async () => {
    if (!selectedSlot) return;

    if (!user) {
      // Enforce login at the point of confirming the reservation.
      navigate('/login', { state: { from: { pathname: `/book/${serviceId}` } } });
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('/bookings', {
        slotId: selectedSlot._id,
        paymentMethod,
      });
      setSuccess(res.data.booking);
      setSelectedSlot(null);
      loadSlots(); // refresh seat counts
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed. Please try another slot.');
      loadSlots(); // slot may have just filled up - refresh
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-loading">Loading slots...</div>;

  if (success) {
    return (
      <div className="page">
        <div className="success-banner">
          <h2>Booking confirmed!</h2>
          <p>
            {service?.name} on{' '}
            {new Date(success.slot.startTime).toLocaleString(undefined, {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
          <p>Payment: {success.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Prepaid'}</p>
          <button onClick={() => navigate('/dashboard')}>Go to My Bookings</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>{service?.name}</h1>
      <p className="subtitle">{service?.description}</p>

      <h3>Available slots (next 3 days)</h3>
      {Object.keys(slotsByDay).length === 0 && <p>No slots available right now.</p>}

      {Object.entries(slotsByDay).map(([day, daySlots]) => (
        <div key={day} className="slot-day-group">
          <h4>{day}</h4>
          <div className="slot-grid">
            {daySlots.map((slot) => (
              <SlotCard
                key={slot._id}
                slot={slot}
                selected={selectedSlot?._id === slot._id}
                onSelect={setSelectedSlot}
              />
            ))}
          </div>
        </div>
      ))}

      {selectedSlot && (
        <div className="booking-panel">
          <h3>Confirm your booking</h3>
          <div className="payment-options">
            <label>
              <input
                type="radio"
                checked={paymentMethod === 'cod'}
                onChange={() => setPaymentMethod('cod')}
              />
              Cash on Delivery
            </label>
            <label>
              <input
                type="radio"
                checked={paymentMethod === 'prepaid'}
                onChange={() => setPaymentMethod('prepaid')}
              />
              Prepaid
            </label>
          </div>

          {error && <div className="error-text">{error}</div>}

          <button onClick={handleConfirm} disabled={submitting}>
            {submitting ? 'Confirming...' : user ? 'Confirm Booking' : 'Log in to Confirm'}
          </button>
        </div>
      )}
    </div>
  );
}
