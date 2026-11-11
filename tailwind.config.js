/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Design System Tokens (HOME_DESIGN.md)
        porcelain: '#F1ECE3',
        sand: '#E7DFD2',
        charcoal: '#26262B',
        'deep-purple': '#5E4F7A',
        heather: '#8F7FA8',
        lemon: '#E6FF3D',

        // Aliases / backwards compatibility
        'dark-gray': '#26262B',
        'heather-purple': '#8F7FA8',
        'electric-lemon': '#E6FF3D',
        'porcelain-tint': '#FAF7F2',
        border: 'rgba(38, 38, 43, 0.12)',
        'border-light': 'rgba(38, 38, 43, 0.06)',
      },
      fontFamily: {
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
        anton: ['Anton', 'sans-serif'],
      },
      fontSize: {
        'section-title': 'clamp(2.5rem, 5vw, 5rem)',
        'hero-tagline': 'clamp(2rem, 3.8vw, 3.5rem)',
      },
      borderRadius: {
        button: '12px',
        input: '12px',
        photo: '20px',
        section: '28px',
      },
      boxShadow: {
        'photo-text': '0 1px 18px rgba(20, 20, 24, 0.45)',
      },
    },
  },
  plugins: [],
};
