export type AuthMode = 'mock' | 'auth0';

const rawMode =
  import.meta.env.VITE_AUTH_MODE || (import.meta.env.DEV ? 'mock' : 'auth0');

export const authMode: AuthMode = rawMode.toLowerCase() === 'auth0' ? 'auth0' : 'mock';

export const isMockAuthMode = authMode === 'mock';
export const isAuth0Mode = authMode === 'auth0';
