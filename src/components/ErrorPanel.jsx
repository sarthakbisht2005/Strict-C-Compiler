import React from 'react';

export default function ErrorPanel({ errors }) {
  if (!errors || errors.length === 0) {
    return (
      <div className="sc-error-empty">
        <span className="sc-success-icon">✓</span>
        <span>No errors found — compilation successful!</span>
      </div>
    );
  }

  return (
    <div className="sc-error-list">
      {errors.map((err, i) => (
        <div key={i} className={`sc-error-item sc-error-${err.severity || 'error'}`}>
          <div className="sc-error-header">
            <span className="sc-error-badge">{err.severity === 'warning' ? '⚠' : '✖'} {err.phase || 'Error'}</span>
            {err.line > 0 && <span className="sc-error-line">Line {err.line}</span>}
          </div>
          <div className="sc-error-msg">{err.message}</div>
        </div>
      ))}
    </div>
  );
}
