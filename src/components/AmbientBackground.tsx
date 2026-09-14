import React from 'react';

export const AmbientBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* 48px Cyberpunk Grid */}
      <div className="absolute inset-0 cyber-grid opacity-60" />

      {/* Ambient Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0b0b0d]/50 to-[#0b0b0d]" />

      {/* Floating Bokeh Glowing Orbs */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full blur-[110px] opacity-25 animate-orb-1"
        style={{
          background: 'radial-gradient(circle, #8077ff 0%, #4d42fc 50%, transparent 75%)',
          top: '-10%',
          left: '15%',
        }}
      />
      <div
        className="absolute w-[420px] h-[420px] rounded-full blur-[100px] opacity-15 animate-orb-2"
        style={{
          background: 'radial-gradient(circle, #10b981 0%, #059669 45%, transparent 75%)',
          bottom: '10%',
          right: '10%',
        }}
      />
      <div
        className="absolute w-[360px] h-[360px] rounded-full blur-[90px] opacity-15 animate-orb-1"
        style={{
          background: 'radial-gradient(circle, #f03277 0%, #4d42fc 45%, transparent 75%)',
          top: '40%',
          right: '-5%',
          animationDelay: '-7s',
        }}
      />
    </div>
  );
};
