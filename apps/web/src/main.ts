import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './assets/styles/main.css';
import { createAuth0 } from '@auth0/auth0-vue';

const app = createApp(App);

app.use(createPinia());

app.use(createAuth0({
  domain: import.meta.env.VITE_AUTH0_DOMAIN,
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
  authorizationParams: {
    audience: import.meta.env.VITE_AUTH0_AUDIENCE,
    redirect_uri: window.location.origin + '/auth/callback',
    scope: 'openid profile email offline_access'
  },
  cacheLocation: 'localstorage',
  useRefreshTokens: true
}));

app.use(router);

app.mount('#app');
