import React from 'react';

export const AmbientGoldAura: React.FC = () => {
  return (
    <div 
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none" 
      style={{ 
        contain: 'strict',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden'
      }}
    >
      {/* 1. Deep Obsidian Base with Pure Royal Gold Radial Layers */}
      <div 
        className="absolute inset-0 bg-[#070709]"
        style={{
          background: `
            radial-gradient(ellipse 90% 50% at 50% 0%, rgba(212,175,55,0.22) 0%, rgba(7,7,9,0) 70%),
            radial-gradient(ellipse 80% 45% at 50% 100%, rgba(195,145,25,0.18) 0%, rgba(7,7,9,0) 75%)
          `
        }}
      />

      {/* 2. Top Hero & Header Royal Gold Flowing Aura */}
      <div
        className="absolute w-[450px] sm:w-[650px] h-[450px] sm:h-[650px] rounded-full blur-[45px] sm:blur-[65px] animate-gold-flow-1"
        style={{
          top: '-8%',
          left: '-5%',
          background: 'radial-gradient(circle, rgba(255,205,25,0.45) 0%, rgba(212,175,55,0.28) 40%, transparent 75%)',
          willChange: 'transform',
          transform: 'translate3d(0,0,0)'
        }}
      />

      {/* 3. Middle Catalog & Categories Warm Amber Gold Flowing Aura */}
      <div
        className="absolute w-[420px] sm:w-[620px] h-[420px] sm:h-[620px] rounded-full blur-[45px] sm:blur-[60px] animate-gold-flow-2"
        style={{
          top: '35%',
          right: '-8%',
          background: 'radial-gradient(circle, rgba(250,195,35,0.42) 0%, rgba(212,175,55,0.25) 42%, transparent 75%)',
          willChange: 'transform',
          transform: 'translate3d(0,0,0)'
        }}
      />

      {/* 4. Bottom Footer Imperial Gold Sweeping Aura */}
      <div
        className="absolute w-[440px] sm:w-[660px] h-[440px] sm:h-[660px] rounded-full blur-[50px] sm:blur-[70px] animate-gold-flow-3"
        style={{
          bottom: '-10%',
          left: '10%',
          background: 'radial-gradient(circle, rgba(255,210,40,0.44) 0%, rgba(212,175,55,0.24) 45%, transparent 80%)',
          willChange: 'transform',
          transform: 'translate3d(0,0,0)'
        }}
      />
    </div>
  );
};
