import React from 'react';

/** Page backdrop: 48px grid plus the same purple ambient light used on the Creators form. */
export const AmbientBackground: React.FC = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
    <div className="absolute inset-0 cyber-grid" />
    <div
      className="absolute inset-0"
      style={{
        background: [
          'radial-gradient(40% 45% at 38% 42%, rgba(77, 66, 252, 0.22), transparent 70%)',
          'radial-gradient(30% 35% at 66% 60%, rgba(100, 90, 255, 0.16), transparent 70%)',
          'radial-gradient(22% 25% at 58% 30%, rgba(240, 50, 119, 0.07), transparent 70%)',
          'radial-gradient(35% 35% at 100% 100%, rgba(100, 90, 255, 0.10), transparent 70%)',
          'linear-gradient(180deg, rgba(11,11,13,0.1), rgba(11,11,13,0.85))',
        ].join(', '),
      }}
    />
  </div>
);
