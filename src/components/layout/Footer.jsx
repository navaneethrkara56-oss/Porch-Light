import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, useInView } from 'framer-motion';
import { CANONICAL_CITIES } from '@/constants/cities';

const CITIES = CANONICAL_CITIES;

/**
 * REBUILT FOOTER
 * Restructured as a flex column, min-height 100dvh on desktop, in order:
 * (a) Top block (brand & newsletter, links, contact) with padding-top clamp(72px, 10vh, 120px)
 * (b) Giant wordmark directly below with margin-block: auto (fully visible, no crop, no overflow clip, ~96% width, ~16.5vw, 2 lines under 768px, #34343B to #2C2C33 gradient)
 * (c) Copyright row pinned to the very bottom with >= 24px gap and 24px bottom padding, right padding for scroll-to-top button
 * On non-desktop: 2-column grid, brand + newsletter full width on top, input and button stack full width, wordmark 2 lines.
 * Email rendered in Manrope font (hello@porchlight.in).
 */
export function Footer() {
  const [email, setEmail] = useState('');
  const footerRef = useRef(null);
  const isInView = useInView(footerRef, { once: true, amount: 0.1 });

  const progressCircleRef = useRef(null);
  const scrollBtnRef = useRef(null);

  const radius = 22;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    let rafId = null;

    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const scrollY = window.scrollY;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const progress = maxScroll > 0 ? Math.min(1, Math.max(0, scrollY / maxScroll)) : 0;

        if (progressCircleRef.current) {
          progressCircleRef.current.style.strokeDashoffset = `${circumference * (1 - progress)}`;
        }

        if (scrollBtnRef.current) {
          const isPastHero = scrollY > window.innerHeight * 0.75;
          scrollBtnRef.current.style.opacity = isPastHero ? '1' : '0';
          scrollBtnRef.current.style.pointerEvents = isPastHero ? 'auto' : 'none';
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [circumference]);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    toast.success('Thank you. We will leave the light on in your inbox.');
    setEmail('');
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <footer
        ref={footerRef}
        id="footer"
        data-header-theme="dark"
        className="relative z-10 w-full bg-charcoal text-porcelain min-h-[100dvh] flex flex-col justify-between"
        style={{
          borderRadius: 0,
          paddingTop: 'clamp(72px, 10vh, 120px)',
          paddingBottom: '24px',
        }}
      >
        <div
          className="w-full mx-auto flex-1 flex flex-col justify-between"
          style={{
            maxWidth: '1680px',
            paddingLeft: 'clamp(20px, 5vw, 96px)',
            paddingRight: 'clamp(20px, 5vw, 96px)',
          }}
        >
          {/* (a) TOP BLOCK: Desktop 3 columns / Non-desktop 2 columns (brand full width) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-[clamp(24px,3.5vw,56px)]">
            {/* COLUMN 1: BRAND & NEWSLETTER */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="col-span-1 md:col-span-2 lg:col-span-5 flex flex-col justify-between space-y-6"
            >
              <div className="space-y-3">
                {/* Logo with 6px Lemon Dot over dotless i */}
                <div className="flex items-center">
                  <span className="font-serif text-[clamp(1.8rem,2.2vw,2.6rem)] tracking-tight text-porcelain select-none">
                    Porch L
                    <span className="relative inline-block">
                      ı
                      <span
                        className="absolute w-[6px] h-[6px] rounded-full bg-lemon"
                        style={{
                          left: '50%',
                          transform: 'translateX(-50%)',
                          top: '0.18em',
                        }}
                        aria-hidden="true"
                      />
                    </span>
                    ght
                  </span>
                </div>

                <p className="font-sans text-[clamp(0.92rem,1.05vw,1.18rem)] text-porcelain/75 max-w-md leading-relaxed">
                  Porch Light. Come home to something real.
                </p>
              </div>

              {/* Newsletter form: stacks on small screens */}
              <form onSubmit={handleSubscribe} className="space-y-2 max-w-md pt-1">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full sm:flex-1 px-4 py-3 rounded-[12px] text-porcelain placeholder:text-porcelain/40 font-mono text-[clamp(0.8rem,0.85vw,0.92rem)] outline-none border focus:border-porcelain transition-colors"
                    style={{
                      backgroundColor: '#33333A',
                      border: '1px solid rgba(241, 236, 227, 0.25)',
                    }}
                  />
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-3 rounded-[12px] font-mono text-[clamp(0.82rem,0.88vw,0.95rem)] font-bold tracking-wider cursor-pointer transition-colors duration-350 min-h-[50px] shadow-sm flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: '#F1ECE3',
                      color: '#26262B',
                      border: '1px solid #F1ECE3',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#26262B';
                      e.currentTarget.style.color = '#F1ECE3';
                      e.currentTarget.style.borderColor = '#26262B';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#F1ECE3';
                      e.currentTarget.style.color = '#26262B';
                      e.currentTarget.style.borderColor = '#F1ECE3';
                    }}
                  >
                    Subscribe
                  </button>
                </div>
              </form>
            </motion.div>

            {/* COLUMN 2: LINK COLUMNS */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="col-span-1 md:col-span-1 lg:col-span-4 grid grid-cols-2 sm:grid-cols-3 gap-6 font-mono text-[clamp(0.78rem,0.82vw,0.92rem)]"
            >
              {/* Explore */}
              <div>
                <h4 className="text-porcelain/50 uppercase tracking-widest text-[clamp(0.7rem,0.75vw,0.82rem)] font-bold mb-3">
                  Explore
                </h4>
                <ul className="space-y-2">
                  <li>
                    <Link
                      to="/buy"
                      className="text-porcelain/80 hover:text-porcelain hover:underline underline-offset-4 transition-colors duration-350 block"
                    >
                      Buy
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/rent"
                      className="text-porcelain/80 hover:text-porcelain hover:underline underline-offset-4 transition-colors duration-350 block"
                    >
                      Rent
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/compare"
                      className="text-porcelain/80 hover:text-porcelain hover:underline underline-offset-4 transition-colors duration-350 block"
                    >
                      Compare
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Company */}
              <div>
                <h4 className="text-porcelain/50 uppercase tracking-widest text-[clamp(0.7rem,0.75vw,0.82rem)] font-bold mb-3">
                  Company
                </h4>
                <ul className="space-y-2">
                  <li>
                    <Link
                      to="/about"
                      className="text-porcelain/80 hover:text-porcelain hover:underline underline-offset-4 transition-colors duration-350 block"
                    >
                      About
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/contact"
                      className="text-porcelain/80 hover:text-porcelain hover:underline underline-offset-4 transition-colors duration-350 block"
                    >
                      Contact
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/privacy"
                      className="text-porcelain/80 hover:text-porcelain hover:underline underline-offset-4 transition-colors duration-350 block"
                    >
                      Legal
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Cities */}
              <div className="col-span-2 sm:col-span-1">
                <h4 className="text-porcelain/50 uppercase tracking-widest text-[clamp(0.7rem,0.75vw,0.82rem)] font-bold mb-3">
                  Cities
                </h4>
                <ul className="space-y-1.5">
                  {CITIES.map((city) => (
                    <li key={city}>
                      <Link
                        to={`/buy?city=${encodeURIComponent(city)}`}
                        className="text-porcelain/75 hover:text-porcelain hover:underline underline-offset-4 transition-colors duration-350 block text-[clamp(0.72rem,0.78vw,0.86rem)]"
                      >
                        {city}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* COLUMN 3: CONTACT INFO */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="col-span-1 md:col-span-1 lg:col-span-3 space-y-4 lg:text-right"
            >
              <div>
                <div className="text-porcelain/50 uppercase tracking-widest font-mono text-[clamp(0.68rem,0.72vw,0.78rem)] font-bold mb-1">
                  Inquiries
                </div>
                <a
                  href="mailto:hello@porchlight.in"
                  className="font-sans text-[clamp(0.85rem,0.92vw,1rem)] text-porcelain hover:underline underline-offset-4 transition-colors duration-350 block"
                >
                  hello@porchlight.in
                </a>
              </div>

              <div>
                <div className="text-porcelain/50 uppercase tracking-widest font-mono text-[clamp(0.68rem,0.72vw,0.78rem)] font-bold mb-1">
                  Desk
                </div>
                <p className="font-mono text-[clamp(0.75rem,0.8vw,0.88rem)] text-porcelain/75 leading-relaxed">
                  42 Garden Estate, Indiranagar
                  <br />
                  Bengaluru, KA 560038
                </p>
              </div>

              <div>
                <div className="text-porcelain/50 uppercase tracking-widest font-mono text-[clamp(0.68rem,0.72vw,0.78rem)] font-bold mb-1">
                  Telephone
                </div>
                <a
                  href="tel:+918041208890"
                  className="font-mono text-[clamp(0.75rem,0.8vw,0.88rem)] text-porcelain hover:underline underline-offset-4 transition-colors duration-350 block"
                >
                  +91 (080) 4120 8890
                </a>
              </div>
            </motion.div>
          </div>

          {/* (b) GIANT WORDMARK: margin-block: auto, fully visible, never cropped */}
          <div
            className="w-full text-center select-none pointer-events-none py-8 md:py-12"
            style={{
              marginBlock: 'auto',
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
              className="w-full flex items-center justify-center leading-none tracking-tighter"
            >
              {/* Desktop / Tablet: One line at ~16.5vw, ~96% content width */}
              <span
                className="hidden md:inline-block font-anton uppercase text-[16.5vw] leading-[0.85] w-full"
                style={{
                  background: 'linear-gradient(180deg, #34343B 0%, #2C2C33 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  color: 'transparent',
                }}
              >
                PORCH LIGHT
              </span>

              {/* Mobile: Two lines (PORCH over LIGHT) */}
              <div
                className="md:hidden flex flex-col items-center uppercase font-anton text-[25vw] leading-[0.85]"
                style={{
                  background: 'linear-gradient(180deg, #34343B 0%, #2C2C33 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  color: 'transparent',
                }}
              >
                <span>PORCH</span>
                <span>LIGHT</span>
              </div>
            </motion.div>
          </div>

          {/* (c) COPYRIGHT ROW: Pinned to very bottom, >= 24px gap, right padding on desktop so scroll-to-top doesn't overlap */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-between font-mono text-[clamp(0.72rem,0.78vw,0.85rem)] text-porcelain/55 pt-6 border-t border-porcelain/10 gap-2"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{
              paddingRight: 'clamp(0px, 5vw, 72px)',
            }}
          >
            <div>© 2026 Porch Light India</div>
            <div>Demo project. No real transactions.</div>
          </motion.div>
        </div>
      </footer>

      {/* FIXED SCROLL-TO-TOP BUTTON: Fixed bottom-right, z-60, 52px circle with 2px SVG progress ring */}
      <button
        ref={scrollBtnRef}
        type="button"
        onClick={scrollToTop}
        aria-label="Scroll to top"
        style={{
          right: 'clamp(16px, 2vw, 32px)',
          bottom: 'clamp(16px, 2vw, 32px)',
          zIndex: 60,
          opacity: 0,
          pointerEvents: 'none',
          transition: 'opacity 350ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        className="fixed w-[52px] h-[52px] rounded-full bg-charcoal text-porcelain p-0 m-0 overflow-hidden flex items-center justify-center shadow-xl border border-porcelain/20 cursor-pointer group active:scale-95"
      >
        <svg
          viewBox="0 0 52 52"
          className="w-full h-full absolute inset-0 pointer-events-none"
        >
          <g transform="rotate(-90 26 26)">
            <circle
              cx="26"
              cy="26"
              r={radius}
              stroke="rgba(241, 236, 227, 0.15)"
              strokeWidth="2"
              fill="transparent"
            />
            <circle
              ref={progressCircleRef}
              cx="26"
              cy="26"
              r={radius}
              stroke="#F1ECE3"
              strokeWidth="2"
              strokeDasharray={circumference}
              strokeDashoffset={circumference}
              strokeLinecap="round"
              fill="transparent"
            />
          </g>
        </svg>

        <ArrowUp
          className="w-5 h-5 text-porcelain relative z-10 pointer-events-none transition-transform duration-350 group-hover:-translate-y-0.5"
          strokeWidth={2.2}
        />
      </button>
    </>
  );
}
export default Footer;
