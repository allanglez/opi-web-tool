import type { App } from 'vue';
import {
  createAuth0,
  type Auth0Plugin,
  type Auth0VueClient,
  type LogoutOptions,
  type RedirectLoginOptions,
} from '@auth0/auth0-vue';
import { isAuth0Mode } from './mode';
import { getEnv } from '../utils/env';

let auth0Plugin: Auth0Plugin | null = null;

function requiredEnv(name: string): string {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`Missing required auth env var: ${name}`);
  }
  return value;
}

export function installAuth0(app: App): Auth0VueClient | null {
  if (!isAuth0Mode) {
    return null;
  }

  if (auth0Plugin) {
    return auth0Plugin;
  }

  const domain = requiredEnv('VITE_AUTH0_DOMAIN');
  const clientId = requiredEnv('VITE_AUTH0_CLIENT_ID');
  const audience = requiredEnv('VITE_AUTH0_AUDIENCE');
  const redirectUri =
    getEnv('VITE_AUTH0_REDIRECT_URI') ||
    `${window.location.origin}/auth/callback`;

  auth0Plugin = createAuth0({
    domain,
    clientId,
    authorizationParams: {
      audience,
      redirect_uri: redirectUri,
      scope: 'openid profile email offline_access',
    },
    cacheLocation: 'localstorage',
    useRefreshTokens: true,
  });

  app.use(auth0Plugin);
  return auth0Plugin;
}

export function getAuth0Client(): Auth0VueClient {
  if (!auth0Plugin) {
    throw new Error('Auth0 client is not initialized. Ensure installAuth0() is called in main.ts.');
  }
  return auth0Plugin;
}

export async function loginWithAuth0Redirect(options?: RedirectLoginOptions): Promise<void> {
  const client = getAuth0Client();
  await client.loginWithRedirect(options);
}

export async function getAuth0AccessToken(): Promise<string | null> {
  if (!isAuth0Mode) {
    return null;
  }

  const client = getAuth0Client();
  return client.getAccessTokenSilently();
}

export function logoutWithAuth0(options?: LogoutOptions): void {
  if (!isAuth0Mode) {
    return;
  }

  const client = getAuth0Client();
  client.logout(options);
}
