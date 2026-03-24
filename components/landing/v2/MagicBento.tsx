"use client";

import { useRef, useEffect, useCallback, useState } from 'react';
import { gsap } from 'gsap';
import './MagicBento.css';

const DEFAULT_PARTICLE_COUNT = 10;
const DEFAULT_SPOTLIGHT_RADIUS = 350;
const DEFAULT_GLOW_COLOR = '125, 200, 40';
const MOBILE_BREAKPOINT = 768;

export const cardData = [
  { color: '#030d1a', title: 'Classement ELO', description: 'Ranking dynamique après chaque match', label: 'Ranking' },
  { color: '#030d1a', title: 'Challenges', description: 'Tournois automatisés en quelques clics', label: 'Compétition' },
  { color: '#030d1a', title: 'Badges & Niveaux', description: 'Gamification qui fidélise vos joueurs', label: 'Fidélisation' },
  { color: '#030d1a', title: 'Dashboard Analytics', description: 'Vision en temps réel de votre club', label: 'Insights' },
  { color: '#030d1a', title: 'App Mobile', description: 'iOS & Android brandée aux couleurs de votre club', label: 'Mobile' },
  { color: '#030d1a', title: 'Intégrations', description: 'Connectez vos outils de réservation existants', label: 'API' },
];

const createParticleElement = (x: number, y: number, color = DEFAULT_GLOW_COLOR) => {
  const el = document.createElement('div');
  el.className = 'mb-particle';
  el.style.cssText = `
    position: absolute;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: rgba(${color}, 1);
    box-shadow: 0 0 6px rgba(${color}, 0.7);
    pointer-events: none;
    z-index: 100;
    left: ${x}px;
    top: ${y}px;
  `;
  return el;
};

const calculateSpotlightValues = (radius: number) => ({
  proximity: radius * 0.5,
  fadeDistance: radius * 0.75,
});

const updateCardGlowProperties = (
  card: HTMLElement,
  mouseX: number,
  mouseY: number,
  glow: number,
  radius: number
) => {
  const rect = card.getBoundingClientRect();
  const relativeX = ((mouseX - rect.left) / rect.width) * 100;
  const relativeY = ((mouseY - rect.top) / rect.height) * 100;
  card.style.setProperty('--glow-x', `${relativeX}%`);
  card.style.setProperty('--glow-y', `${relativeY}%`);
  card.style.setProperty('--glow-intensity', glow.toString());
  card.style.setProperty('--glow-radius', `${radius}px`);
};

const ParticleCard = ({
  children,
  className = '',
  style,
  disableAnimations = false,
  particleCount = DEFAULT_PARTICLE_COUNT,
  glowColor = DEFAULT_GLOW_COLOR,
  enableTilt = false,
  clickEffect = true,
  enableMagnetism = false,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  disableAnimations?: boolean;
  particleCount?: number;
  glowColor?: string;
  enableTilt?: boolean;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLElement[]>([]);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const isHoveredRef = useRef(false);
  const memoizedParticles = useRef<HTMLElement[]>([]);
  const particlesInitialized = useRef(false);

  const initializeParticles = useCallback(() => {
    if (particlesInitialized.current || !cardRef.current) return;
    const { width, height } = cardRef.current.getBoundingClientRect();
    memoizedParticles.current = Array.from({ length: particleCount }, () =>
      createParticleElement(Math.random() * width, Math.random() * height, glowColor)
    );
    particlesInitialized.current = true;
  }, [particleCount, glowColor]);

  const clearAllParticles = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    particlesRef.current.forEach((particle) => {
      gsap.to(particle, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: 'back.in(1.7)',
        onComplete: () => particle.parentNode?.removeChild(particle),
      });
    });
    particlesRef.current = [];
  }, []);

  const animateParticles = useCallback(() => {
    if (!cardRef.current || !isHoveredRef.current) return;
    if (!particlesInitialized.current) initializeParticles();
    memoizedParticles.current.forEach((particle, index) => {
      const id = setTimeout(() => {
        if (!isHoveredRef.current || !cardRef.current) return;
        const clone = particle.cloneNode(true) as HTMLElement;
        cardRef.current.appendChild(clone);
        particlesRef.current.push(clone);
        gsap.fromTo(clone, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' });
        gsap.to(clone, { x: (Math.random() - 0.5) * 80, y: (Math.random() - 0.5) * 80, rotation: Math.random() * 360, duration: 2 + Math.random() * 2, ease: 'none', repeat: -1, yoyo: true });
        gsap.to(clone, { opacity: 0.35, duration: 1.5, ease: 'power2.inOut', repeat: -1, yoyo: true });
      }, index * 80);
      timeoutsRef.current.push(id);
    });
  }, [initializeParticles]);

  useEffect(() => {
    if (disableAnimations || !cardRef.current) return;
    const element = cardRef.current;

    const handleMouseEnter = () => {
      isHoveredRef.current = true;
      animateParticles();
      if (enableTilt) gsap.to(element, { rotateX: 4, rotateY: 4, duration: 0.3, ease: 'power2.out', transformPerspective: 1000 });
    };
    const handleMouseLeave = () => {
      isHoveredRef.current = false;
      clearAllParticles();
      if (enableTilt) gsap.to(element, { rotateX: 0, rotateY: 0, duration: 0.3, ease: 'power2.out' });
      if (enableMagnetism) gsap.to(element, { x: 0, y: 0, duration: 0.3, ease: 'power2.out' });
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (!enableTilt && !enableMagnetism) return;
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      const cx = rect.width / 2, cy = rect.height / 2;
      if (enableTilt) gsap.to(element, { rotateX: ((y - cy) / cy) * -8, rotateY: ((x - cx) / cx) * 8, duration: 0.1, ease: 'power2.out', transformPerspective: 1000 });
      if (enableMagnetism) gsap.to(element, { x: (x - cx) * 0.04, y: (y - cy) * 0.04, duration: 0.3, ease: 'power2.out' });
    };
    const handleClick = (e: MouseEvent) => {
      if (!clickEffect) return;
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      const maxDist = Math.max(Math.hypot(x, y), Math.hypot(x - rect.width, y), Math.hypot(x, y - rect.height), Math.hypot(x - rect.width, y - rect.height));
      const ripple = document.createElement('div');
      ripple.style.cssText = `position:absolute;width:${maxDist * 2}px;height:${maxDist * 2}px;border-radius:50%;background:radial-gradient(circle,rgba(${glowColor},0.35) 0%,rgba(${glowColor},0.15) 30%,transparent 70%);left:${x - maxDist}px;top:${y - maxDist}px;pointer-events:none;z-index:1000;`;
      element.appendChild(ripple);
      gsap.fromTo(ripple, { scale: 0, opacity: 1 }, { scale: 1, opacity: 0, duration: 0.7, ease: 'power2.out', onComplete: () => ripple.remove() });
    };

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('click', handleClick);
    return () => {
      isHoveredRef.current = false;
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('click', handleClick);
      clearAllParticles();
    };
  }, [animateParticles, clearAllParticles, disableAnimations, enableTilt, enableMagnetism, clickEffect, glowColor]);

  return (
    <div ref={cardRef} className={`${className} mb-particle-container`} style={{ ...style, position: 'relative', overflow: 'hidden' }}>
      {children}
    </div>
  );
};

const GlobalSpotlight = ({
  gridRef,
  disableAnimations = false,
  enabled = true,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  glowColor = DEFAULT_GLOW_COLOR,
}: {
  gridRef: React.RefObject<HTMLDivElement | null>;
  disableAnimations?: boolean;
  enabled?: boolean;
  spotlightRadius?: number;
  glowColor?: string;
}) => {
  useEffect(() => {
    if (disableAnimations || !gridRef?.current || !enabled) return;
    const spotlight = document.createElement('div');
    spotlight.style.cssText = `position:fixed;width:700px;height:700px;border-radius:50%;pointer-events:none;background:radial-gradient(circle,rgba(${glowColor},0.12) 0%,rgba(${glowColor},0.06) 15%,rgba(${glowColor},0.03) 28%,rgba(${glowColor},0.01) 45%,transparent 65%);z-index:200;opacity:0;transform:translate(-50%,-50%);mix-blend-mode:screen;`;
    document.body.appendChild(spotlight);

    const handleMouseMove = (e: MouseEvent) => {
      if (!gridRef.current) return;
      const section = gridRef.current.closest('.mb-bento-section');
      const rect = section?.getBoundingClientRect();
      const inside = rect && e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      const cards = gridRef.current.querySelectorAll<HTMLElement>('.magic-bento-card');

      if (!inside) {
        gsap.to(spotlight, { opacity: 0, duration: 0.3, ease: 'power2.out' });
        cards.forEach((c) => c.style.setProperty('--glow-intensity', '0'));
        return;
      }

      const { proximity, fadeDistance } = calculateSpotlightValues(spotlightRadius);
      let minDist = Infinity;

      cards.forEach((card) => {
        const cr = card.getBoundingClientRect();
        const cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2;
        const dist = Math.max(0, Math.hypot(e.clientX - cx, e.clientY - cy) - Math.max(cr.width, cr.height) / 2);
        minDist = Math.min(minDist, dist);
        let glow = 0;
        if (dist <= proximity) glow = 1;
        else if (dist <= fadeDistance) glow = (fadeDistance - dist) / (fadeDistance - proximity);
        updateCardGlowProperties(card, e.clientX, e.clientY, glow, spotlightRadius);
      });

      gsap.to(spotlight, { left: e.clientX, top: e.clientY, duration: 0.1, ease: 'power2.out' });
      const targetOpacity = minDist <= proximity ? 0.75 : minDist <= fadeDistance ? ((fadeDistance - minDist) / (fadeDistance - proximity)) * 0.75 : 0;
      gsap.to(spotlight, { opacity: targetOpacity, duration: targetOpacity > 0 ? 0.2 : 0.5, ease: 'power2.out' });
    };

    const handleMouseLeave = () => {
      gridRef.current?.querySelectorAll<HTMLElement>('.magic-bento-card').forEach((c) => c.style.setProperty('--glow-intensity', '0'));
      gsap.to(spotlight, { opacity: 0, duration: 0.3, ease: 'power2.out' });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      spotlight.parentNode?.removeChild(spotlight);
    };
  }, [gridRef, disableAnimations, enabled, spotlightRadius, glowColor]);

  return null;
};

interface MagicBentoProps {
  textAutoHide?: boolean;
  enableStars?: boolean;
  enableSpotlight?: boolean;
  enableBorderGlow?: boolean;
  disableAnimations?: boolean;
  spotlightRadius?: number;
  particleCount?: number;
  enableTilt?: boolean;
  glowColor?: string;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
}

const MagicBento = ({
  textAutoHide = true,
  enableStars = true,
  enableSpotlight = true,
  enableBorderGlow = true,
  disableAnimations = false,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  particleCount = DEFAULT_PARTICLE_COUNT,
  enableTilt = false,
  glowColor = DEFAULT_GLOW_COLOR,
  clickEffect = true,
  enableMagnetism = false,
}: MagicBentoProps) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const shouldDisable = disableAnimations || isMobile;

  return (
    <>
      {enableSpotlight && (
        <GlobalSpotlight gridRef={gridRef} disableAnimations={shouldDisable} enabled={enableSpotlight} spotlightRadius={spotlightRadius} glowColor={glowColor} />
      )}
      <div className="mb-card-grid mb-bento-section" ref={gridRef}>
        {cardData.map((card, index) => {
          const baseClass = `magic-bento-card ${textAutoHide ? 'magic-bento-card--text-autohide' : ''} ${enableBorderGlow ? 'magic-bento-card--border-glow' : ''}`;
          const cardStyle: React.CSSProperties = { backgroundColor: card.color, '--glow-color': glowColor } as React.CSSProperties;

          return enableStars ? (
            <ParticleCard key={index} className={baseClass} style={cardStyle} disableAnimations={shouldDisable} particleCount={particleCount} glowColor={glowColor} enableTilt={enableTilt} clickEffect={clickEffect} enableMagnetism={enableMagnetism}>
              <div className="mb-card-header"><div className="mb-card-label">{card.label}</div></div>
              <div className="mb-card-content">
                <h3 className="mb-card-title">{card.title}</h3>
                <p className="mb-card-desc">{card.description}</p>
              </div>
            </ParticleCard>
          ) : (
            <div key={index} className={baseClass} style={cardStyle}>
              <div className="mb-card-header"><div className="mb-card-label">{card.label}</div></div>
              <div className="mb-card-content">
                <h3 className="mb-card-title">{card.title}</h3>
                <p className="mb-card-desc">{card.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default MagicBento;
