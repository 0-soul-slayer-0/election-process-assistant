import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#4f7bff',
          light: '#7a9eff',
        },
        secondary: '#00d4aa',
        surface: {
          DEFAULT: '#0d1629',
          2: '#132040',
          3: '#1a2a50',
        },
      },
    },
  },
  plugins: [],
};

export default config;
