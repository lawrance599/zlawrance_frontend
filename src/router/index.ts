import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      name: 'Dashboard',
      component: () => import('@/views/Dashboard.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/data',
      name: 'DataManagement',
      component: () => import('@/views/DataManagement.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
});

// 路由守卫
router.beforeEach((_to, _from, next) => {
  // 在回调中获取 store，确保 Pinia 已初始化
  const isAuthenticated = !!localStorage.getItem('token');

  if (_to.meta.requiresAuth && !isAuthenticated) {
    next('/login');
  } else if (_to.path === '/login' && isAuthenticated) {
    next('/');
  } else {
    next();
  }
});

export default router;
