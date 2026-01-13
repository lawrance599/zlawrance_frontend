<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import type { UserInfo } from '@/api/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const status = ref<'loading' | 'success' | 'error'>('loading');
const message = ref('');
const countdown = ref(3);

onMounted(async () => {
  const { token, user_id, username, error } = route.query;

  // 错误处理
  if (error) {
    status.value = 'error';
    message.value = decodeURIComponent(error as string);
    startCountdown('/login');
    return;
  }

  // 成功处理
  if (token && user_id && username) {
    // 存储认证信息
    localStorage.setItem('token', token as string);
    localStorage.setItem('user_id', user_id as string);
    localStorage.setItem('username', username as string);

    // 手动更新 pinia 状态
    const userInfo: UserInfo = {
      id: Number(user_id),
      username: username as string,
      role: 'user',
    };
    authStore.token = token as string;
    authStore.user = userInfo;

    status.value = 'success';
    message.value = `登录成功，欢迎 ${username}`;
    startCountdown('/');
  } else {
    // 参数缺失
    status.value = 'error';
    message.value = '登录参数不完整';
    startCountdown('/login');
  }
});

function startCountdown(redirectPath: string) {
  const timer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      clearInterval(timer);
      router.replace(redirectPath);
    }
  }, 1000);
}
</script>

<template>
  <div class="min-h-screen bg-slate-900 flex items-center justify-center">
    <div class="w-full max-w-md px-6">
      <!-- 状态卡片 -->
      <div class="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700 text-center">
        <!-- 加载状态 -->
        <div v-if="status === 'loading'" class="py-8">
          <svg class="animate-spin w-12 h-12 mx-auto text-blue-500 mb-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <h2 class="text-xl font-semibold text-white mb-2">正在处理登录...</h2>
          <p class="text-slate-400">请稍候</p>
        </div>

        <!-- 成功状态 -->
        <div v-else-if="status === 'success'" class="py-8">
          <div class="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 class="text-xl font-semibold text-white mb-2">{{ message }}</h2>
          <p class="text-slate-400">正在跳转到首页...</p>
          <p class="text-slate-500 text-sm mt-4">{{ countdown }} 秒后自动跳转</p>
        </div>

        <!-- 错误状态 -->
        <div v-else class="py-8">
          <div class="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 class="text-xl font-semibold text-white mb-2">登录失败</h2>
          <p class="text-red-400 mb-4">{{ message }}</p>
          <p class="text-slate-400">正在跳转到登录页...</p>
          <p class="text-slate-500 text-sm mt-4">{{ countdown }} 秒后自动跳转</p>
        </div>
      </div>
    </div>
  </div>
</template>
