import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      redirect: '/admin/dashboard',
    },
    {
      path: '/admin/dashboard',
      name: 'admin-dashboard',
      component: () => import('../pages/admin/AdminDashboardPage.vue'),
    },
  ],
});

export default router;
