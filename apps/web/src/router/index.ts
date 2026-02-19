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
          next({ name: 'coordinator-dashboard' });
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
    {
      path: '/admin/data-verification',
      name: 'admin-data-verification',
      component: () => import('../pages/admin/DataVerificationPage.vue'),
      meta: { roles: ['ADMIN'] },
    },
    {
      path: '/admin/users',
      name: 'admin-user-management',
      component: () => import('../pages/admin/UserManagementPage.vue'),
      meta: { roles: ['ADMIN'] },
    },
    {
      path: '/admin/progress-tracking',
      name: 'admin-progress-tracking',
      component: () => import('../pages/admin/ProgressTrackingPage.vue'),
      meta: { roles: ['ADMIN'] },
    },
    {
      path: '/admin/audit-log',
      name: 'admin-audit-log',
      component: () => import('../pages/admin/AuditLogPage.vue'),
      meta: { roles: ['ADMIN'] },
    },
    {
      path: '/admin/reports',
      name: 'admin-reports',
      component: () => import('../pages/admin/ReportsExportPage.vue'),
      meta: { roles: ['ADMIN'] },
    },
    {
      path: '/admin/retention',
      name: 'admin-retention',
      component: () => import('../pages/admin/RetentionConfigPage.vue'),
      meta: { roles: ['ADMIN'] },
    },
    {
      path: '/admin/reset',
      name: 'admin-reset',
      component: () => import('../pages/admin/ResetPage.vue'),
      meta: { roles: ['ADMIN'] },
    },
    // Coordinator routes
    {
      path: '/coordinator/dashboard',
      name: 'coordinator-dashboard',
      component: () => import('../pages/coordinator/CoordinatorDashboardPage.vue'),
      meta: { roles: ['COORDINATOR', 'ADMIN'] },
    },
    {
      path: '/coordinator/assignments',
      name: 'coordinator-assignments',
      component: () => import('../pages/coordinator/AssignmentsPage.vue'),
      meta: { roles: ['COORDINATOR', 'ADMIN'] },
    },
    {
      path: '/coordinator/scheduling',
      name: 'coordinator-scheduling',
      component: () => import('../pages/coordinator/SchedulingPage.vue'),
      meta: { roles: ['COORDINATOR', 'ADMIN'] },
    },
    {
      path: '/coordinator/reports',
      name: 'coordinator-reports',
      component: () => import('../pages/coordinator/CoordinatorReportsPage.vue'),
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
      path: '/evaluator/assignments',
      name: 'evaluator-assignments',
      component: () => import('../pages/evaluator/MyAssignmentsPage.vue'),
      meta: { roles: ['EVALUATOR', 'COORDINATOR', 'ADMIN'] },
    },
    {
      path: '/evaluator/class-view',
      name: 'evaluator-class-view',
      component: () => import('../pages/evaluator/ClassViewPage.vue'),
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
    {
      path: '/evaluator/classes/:id/summary',
      name: 'evaluator-class-summary',
      component: () => import('../pages/evaluator/ClassSummaryPage.vue'),
      meta: { roles: ['EVALUATOR', 'COORDINATOR', 'ADMIN'] },
    },
  ],
});

// Apply auth guard globally
router.beforeEach(authGuard);

export default router;
