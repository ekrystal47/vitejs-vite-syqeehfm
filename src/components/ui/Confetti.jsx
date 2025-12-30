import React, { useEffect, useRef } from 'react';

const Confetti = ({ isActive }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

    // Create Particles
    for (let i = 0; i < 100; i++) {
      particles.push({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20 - 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        gravity: 0.5,
        drag: 0.95,
        life: 100
      });
    }

    let animationId;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      let activeParticles = 0;
      particles.forEach(p => {
        if (p.life > 0) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += p.gravity;
          p.vx *= p.drag;
          p.vy *= p.drag;
          p.life--;

          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          activeParticles++;
        }
      });

      if (activeParticles > 0) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => cancelAnimationFrame(animationId);
  }, [isActive]);

  if (!isActive) return null;

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 z-[9999] pointer-events-none"
    />
  );
};

export default Confetti;