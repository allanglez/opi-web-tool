import { createRouter, createWebHistory } from 'vue-router';
import { authGuard } from './guards';
import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: { render: () => null }, // Empty component
      beforeEnter: (_to, _from, next) => {
        const authStore = useAuthStore();
        if (!authStore.isAuthenticated) {
          next({ name: 'login' });
        } else if (authStore.isAdmin) {
          next({ name: 'admin-dashboard' });
        } else if (authStore.isCoordinator) {
          next({ name: 'admin-dashboard' });
        } else if (authStore.isEvaluator) {
          next({ name: 'evaluator-dashboard' });
        } else {
          next({ name: 'forbidden' });
        }
      },
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
    // Coordinator routes
    {
      path: '/coordinator/assignments',
      name: 'coordinator-assignments',
      component: () => import('../pages/coordinator/AssignmentsPage.vue'),
      meta: { roles: ['COORDINATOR', 'ADMIN'] },
    },
    // Evaluator routes
    {
      path: '/evaluator/dashboard',
      name: 'evaluator-dashboard',
      component: () => import('../pages/evaluator/EvaluatorDashboardPage.vue'),
      meta: { roles: ['EVALUATOR', 'COORDINATOR', 'ADMIN'] },
    },
    {
      path: '/evaluator/classes/:classId',
      name: 'evaluator-class-students',
      component: () => import('../pages/evaluator/ClassStudentsPage.vue'),
      meta: { roles: ['EVALUATOR', 'COORDINATOR', 'ADMIN'] },
    },
    {
      path: '/evaluator/assessments/:assessmentId',
      name: 'evaluator-assessment-form',
      component: () => import('../pages/evaluator/AssessmentFormPage.vue'),
      meta: { roles: ['EVALUATOR', 'COORDINATOR', 'ADMIN'] },
    },
  ],
});

// Apply auth guard globally
router.beforeEach(authGuard);

export default router;
