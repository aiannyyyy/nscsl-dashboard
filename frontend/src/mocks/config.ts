/** True when the app should serve mock data instead of calling the real API. */
export const isMockMode = (): boolean =>
  import.meta.env.VITE_USE_MOCKS === 'true';

export const MOCK_TOKEN = 'mock-portfolio-jwt-token';
