import React from 'react';

export default function SlotCard({ slot, selected, onSelect }) {
  const start = new Date(slot.startTime);
  const end = new Date(slot.endTime);
  const full = slot.bookedCount >= slot.capacity;
  const seatsLeft = slot.capacity - slot.bookedCount;

  return (
    <button
      className={`slot-card ${selected ? 'selected' : ''} ${full ? 'full' : ''}`}
      disabled={full}
      onClick={() => onSelect(slot)}
    >
      <div className="slot-date">
        {start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
      </div>
      <div className="slot-time">
        {start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} -{' '}
        {end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
      </div>
      <div className="slot-seats">{full ? 'Fully booked' : `${seatsLeft} seat(s) left`}</div>
    </button>
  );
}
