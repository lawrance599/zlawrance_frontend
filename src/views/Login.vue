<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const loginType = ref<'username' | 'phone'>('username');
const id = ref('');
const password = ref('');
const showPassword = ref(false);

async function handleLogin() {
  if (!id.value || !password.value) return;

  const success = await authStore.login(loginType.value, id.value, password.value);
  console.log('登录结果:', success, 'token:', localStorage.getItem('token'));
  if (success) {
    // 确保状态更新后再跳转
    setTimeout(() => {
      router.replace('/');
    }, 100);
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-900 flex items-center justify-center">
    <div class="w-full max-w-md px-6">
      <!-- Logo 和标题 -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">智慧水利平台</h1>
        <p class="text-slate-400">Smart Water Conservancy</p>
      </div>

      <!-- 登录表单 -->
      <div class="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
        <h2 class="text-xl font-semibold text-white mb-6 text-center">用户登录</h2>

        <!-- 登录类型切换 -->
        <div class="flex gap-2 mb-6 p-1 bg-slate-900 rounded-lg">
          <button
            :class="[
              'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all',
              loginType === 'username'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            ]"
            @click="loginType = 'username'"
          >
            用户名登录
          </button>
          <button
            :class="[
              'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all',
              loginType === 'phone'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            ]"
            @click="loginType = 'phone'"
          >
            手机号登录
          </button>
        </div>

        <!-- 表单 -->
        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-sm text-slate-400 mb-2">
              {{ loginType === 'username' ? '用户名' : '手机号' }}
            </label>
            <input
              v-model="id"
              type="text"
              class="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              :placeholder="loginType === 'username' ? '请输入用户名' : '请输入手机号'"
            />
          </div>

          <div>
            <label class="block text-sm text-slate-400 mb-2">密码</label>
            <div class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                class="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors pr-12"
                placeholder="请输入密码"
              />
              <button
                type="button"
                class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                @click="showPassword = !showPassword"
              >
                <svg v-if="showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
          </div>

          <!-- 错误提示 -->
          <div v-if="authStore.error" class="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p class="text-sm text-red-400">{{ authStore.error }}</p>
          </div>

          <!-- 登录按钮 -->
          <button
            type="submit"
            :disabled="authStore.loading"
            class="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg v-if="authStore.loading" class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {{ authStore.loading ? '登录中...' : '登 录' }}
          </button>
        </form>

        <!-- 分隔线 -->
        <div class="flex items-center gap-4 my-6">
          <div class="flex-1 h-px bg-slate-700" />
          <span class="text-sm text-slate-500">或者</span>
          <div class="flex-1 h-px bg-slate-700" />
        </div>

        <!-- GitHub 登录 -->
        <a
          href="http://127.0.0.1:8080/api/auth/oauth/github/authorize"
          class="flex items-center justify-center gap-2 w-full py-3 bg-slate-900 hover:bg-slate-700 border border-slate-700 text-white font-medium rounded-lg transition-colors"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          GitHub 登录
        </a>
      </div>

      <!-- 底部信息 -->
      <p class="text-center text-slate-500 text-sm mt-6">
        默认账号: admin / password123
      </p>
    </div>
  </div>
</template>
