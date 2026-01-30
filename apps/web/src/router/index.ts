import { createRouter, createWebHistory } from 'vue-router';
import { authGuard } from './guards';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      redirect: '/admin/dashboard',
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../pages/auth/LoginPage.vue'),
      meta: { public: true },
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: () => import('../pages/auth/CallbackPage.vue'),
      meta: { public: true },
    },
    {
      path: '/forbidden',
      name: 'forbidden',
      component: () => import('../pages/ForbiddenPage.vue'),
      meta: { public: true },
    },
    {
      path: '/cycle-not-approved',
      name: 'cycle-not-approved',
      component: () => import('../pages/CycleNotApprovedPage.vue'),
      meta: { roles: ['COORDINATOR', 'EVALUATOR'] },
    },
    {
      path: '/admin/dashboard',
      name: 'admin-dashboard',
      component: () => import('../pages/admin/AdminDashboardPage.vue'),
      meta: { roles: ['ADMIN', 'COORDINATOR'] },
    },
    {
      path: '/admin/cycle',
      name: 'admin-cycle',
      component: () => import('../pages/admin/cycle/CycleSetupPage.vue'),
      meta: { roles: ['ADMIN'] },
    },
    {
      path: '/admin/ingestion',
      name: 'admin-ingestion',
      component: () => import('../pages/admin/cycle/IngestionStatusPage.vue'),
      meta: { roles: ['ADMIN'] },
    },
    {
      path: '/admin/cycle/classes',
      name: 'admin-cycle-classes',
      component: () => import('../pages/admin/cycle/ClassInclusionPage.vue'),
      meta: { roles: ['ADMIN'] },
    },
  ],
});

// Apply auth guard globally
router.beforeEach(authGuard);

export default router;
