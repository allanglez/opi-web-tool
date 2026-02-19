import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './assets/styles/main.css';
import { installAuth0 } from './auth/auth0';

const app = createApp(App);

app.use(createPinia());

installAuth0(app);

app.use(router);

app.mount('#app');
