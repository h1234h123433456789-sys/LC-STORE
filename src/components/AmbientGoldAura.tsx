import React from 'react';

export const AmbientGoldAura: React.FC = () => {
  return (
    <div 
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
    >
      {/* 1. Pure Royal Gold Radial Layers */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 85% 50% at 50% 0%, rgba(212,175,55,0.22) 0%, rgba(170,122,30,0.09) 45%, transparent 75%),
            radial-gradient(ellipse 75% 50% at 50% 100%, rgba(185,135,28,0.18) 0%, transparent 72%)
          `,
        }}
      />

      {/* 2. Top-Right Moving Golden Orb (Smooth multi-stop gradient — zero GPU blur flicker) */}
      <div
        className="absolute -top-32 -right-24 w-[480px] sm:w-[700px] h-[480px] sm:h-[700px] rounded-full animate-gold-flow-1"
        style={{
          background: 'radial-gradient(circle, rgba(255,215,65,0.26) 0%, rgba(212,175,55,0.13) 35%, rgba(212,175,55,0.04) 58%, transparent 75%)',
        }}
      />

      {/* 3. Top-Left Moving Golden Orb */}
      <div
        className="absolute top-12 -left-24 w-[440px] sm:w-[640px] h-[440px] sm:h-[640px] rounded-full animate-gold-flow-2"
        style={{
          background: 'radial-gradient(circle, rgba(245,195,45,0.22) 0%, rgba(212,175,55,0.10) 38%, rgba(212,175,55,0.03) 60%, transparent 75%)',
        }}
      />

      {/* 4. Center-Right Floating Royal Gold Orb */}
      <div
        className="absolute top-[36%] -right-20 w-[400px] sm:w-[580px] h-[400px] sm:h-[580px] rounded-full animate-gold-flow-3"
        style={{
          background: 'radial-gradient(circle, rgba(255,210,55,0.20) 0%, rgba(190,140,30,0.09) 40%, transparent 72%)',
        }}
      />

      {/* 5. Bottom-Left Warm Gold Sweep */}
      <div
        className="absolute bottom-8 -left-24 w-[460px] sm:w-[660px] h-[460px] sm:h-[660px] rounded-full animate-gold-flow-4"
        style={{
          background: 'radial-gradient(circle, rgba(235,180,35,0.22) 0%, rgba(180,130,25,0.09) 40%, transparent 72%)',
        }}
      />

      {/* 6. Center Breathing Gold Core */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[380px] sm:w-[560px] h-[380px] sm:h-[560px] rounded-full animate-gold-breath"
        style={{
          background: 'radial-gradient(circle, rgba(255,220,90,0.15) 0%, rgba(212,175,55,0.06) 42%, transparent 72%)',
        }}
      />
    </div>
  );
};
