/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        heading: ['"Funnel Sans"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        caption: ['Geist', 'system-ui', 'sans-serif'],
        data: ['"Geist Mono"', 'system-ui', 'monospace'],
      },
      colors: {
        primary: {
          DEFAULT: '#0062FF',
          dark: '#004ECC',
          light: '#4B83FF',
        },
        surface: '#FFFFFF',
        background: '#F8FAFC',
        'text-primary': '#1A1A1A',
        'text-secondary': '#4B5563',
        'text-muted': '#4B5563',
        border: '#E5E7EB',
        'border-subtle': '#F3F4F6',
        'icon-bg': '#EBF4FF',
        accent: {
          DEFAULT: '#0062FF',
          100: '#0062FF1A',
          200: '#0062FF33',
          50: '#0062FF0D',
        },
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      borderRadius: {
        'device': '2.5rem',
        'card': '0.75rem',
        'pill': '9999px',
      },
      backgroundImage: {
        'gradient-a': 'linear-gradient(180deg, #076CAB 0%, #32C9FD 55%, #DEFCFF 100%)',
        'gradient-b': 'linear-gradient(180deg, #1986E6 0%, #8ACAE5 55%, #DEFCFF 100%)',
      },
      boxShadow: {
        'soft': '0px 2px 8px 0px #0000000D',
        'lift': '0px 4px 12px 0px #00000014',
        'icon': '0px 2px 6px 0px #0000000D',
      },
      width: {
        'phone': '393px',
      },
      height: {
        'phone': '844px',
      },
      maxWidth: {
        'phone': '430px',
      },
    },
  },
  plugins: [],
};
