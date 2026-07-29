import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="page home-hero">
      <h1>KineticAge</h1>
      <p className="subtitle">
        Senior wellness and mobility programs - book a session in minutes.
      </p>
      <Link to="/services" className="cta-button">
        Browse Services
      </Link>
    </div>
  );
}
