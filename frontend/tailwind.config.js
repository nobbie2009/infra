/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#0a0a0a',
          surface: '#0d1117',
          border: '#1a3a1a',
          primary: '#00ff41',
          secondary: '#00cc33',
          accent: '#39ff14',
          muted: '#2d4a2d',
          danger: '#ff0040',
          warning: '#ffcc00',
          text: {
            primary: '#00ff41',
            secondary: '#00cc33',
            muted: '#4a6a4a'
          }
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Courier New', 'monospace']
      },
      boxShadow: {
        'terminal-glow': '0 0 10px rgba(0, 255, 65, 0.3)',
        'terminal-glow-strong': '0 0 20px rgba(0, 255, 65, 0.5)'
      }
    }
  },
  plugins: [],
}
