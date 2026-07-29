import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const CATEGORY_LABELS = {
  'senior-wellness': 'Senior Wellness',
  'mobility-program': 'Mobility Program',
};

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get('/services')
      .then((res) => setServices(res.data.services))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading">Loading services...</div>;

  return (
    <div className="page">
      <h1>Our Services</h1>
      <p className="subtitle">Senior wellness and mobility programs, tailored to your needs.</p>

      {['senior-wellness', 'mobility-program'].map((cat) => (
        <div key={cat} className="service-category">
          <h2>{CATEGORY_LABELS[cat]}</h2>
          <div className="service-grid">
            {services
              .filter((s) => s.category === cat)
              .map((s) => (
                <div key={s._id} className="service-card">
                  <h3>{s.name}</h3>
                  <p>{s.description}</p>
                  <div className="service-meta">
                    <span>{s.durationMinutes} min</span>
                    <span>{s.price === 0 ? 'Free' : `₹${s.price}`}</span>
                  </div>
                  <button onClick={() => navigate(`/book/${s._id}`)}>View Slots</button>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
