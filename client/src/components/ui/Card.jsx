import React from 'react';
import './Card.css';

export const Card = ({ title, children, className = '', ...props }) => {
  return (
    <div className={`card ${className}`} {...props}>
      {title && <h3 className="card-title">{title}</h3>}
      <div className="card-body">{children}</div>
    </div>
  );
};
