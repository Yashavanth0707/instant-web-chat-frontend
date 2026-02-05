export const theme = {
  colors: {
    primary: '#646cff',
    primaryHover: '#535bf2',
    background: '#121212',
    surface: '#1a1a1a',
    surfaceLight: '#222',
    border: '#333',
    text: 'rgba(255, 255, 255, 0.87)',
    textMuted: '#888',
    textDark: '#666',
    error: '#ff4444',
    errorHover: '#ff2222',
    success: '#22c55e',
    white: '#fff',
    black: '#000',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '20px',
    full: '50%',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    xxl: '40px',
  },
  fontSize: {
    xs: '0.7rem',
    sm: '0.8rem',
    md: '0.9rem',
    base: '1rem',
    lg: '1.2rem',
    xl: '1.5rem',
    xxl: '2.5rem',
  },
  transitions: {
    fast: '0.2s ease',
    normal: '0.3s ease',
  },
};

export type Theme = typeof theme;
