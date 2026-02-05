import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  * {
    box-sizing: border-box;
  }

  :root {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.5;
    font-weight: 400;
    color-scheme: dark;
    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    margin: 0;
    min-width: 320px;
    min-height: 100vh;
    background-color: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
  }

  #root {
    width: 100%;
    min-height: 100vh;
  }

  a {
    font-weight: 500;
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;

    &:hover {
      color: ${({ theme }) => theme.colors.primaryHover};
    }
  }

  h1, h2, h3, h4, h5, h6 {
    margin: 0 0 1rem 0;
  }

  p {
    margin: 0 0 1rem 0;
  }

  button, input {
    font-family: inherit;
  }
`;
