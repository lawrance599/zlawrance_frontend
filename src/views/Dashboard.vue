<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useSensorStore } from '@/stores/sensor';
import CesiumViewer from '@/CesiumViewer.vue';

const router = useRouter();
const authStore = useAuthStore();
const sensorStore = useSensorStore();

// Cesium 设置
const enableLighting = ref(true);
const depthTestAgainstTerrain = ref(true);
const showTimeline = ref(true);
const showAnimation = ref(true);

// 处理传感器点击
function handleSensorClick(code: string) {
  console.log('点击传感器:', code);
  // 跳转到数据管理页面，并携带sensorCode参数
  router.push({ path: '/data', query: { sensorCode: code } });
}

// 退出登录
function logout() {
  authStore.logout();
  router.push('/login');
}

// 获取传感器状态分类
const sensorsByType = computed(() => ({
  EX: sensorStore.exPoints.length,
  TC: sensorStore.tcPoints.length,
  IP: sensorStore.ipPoints.length,
}));

onMounted(() => {
  sensorStore.fetchPoints();
});
</script>

<template>
  <div class="h-screen bg-slate-900 flex flex-col">
    <!-- 顶部导航栏 -->
    <header class="bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <h1 class="text-xl font-bold text-white">智慧水利平台</h1>
        <span class="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">大坝安全监测系统</span>
      </div>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2 text-slate-400">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>{{ authStore.user?.username || '用户' }}</span>
        </div>
        <button @click="logout"
          class="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
          退出
        </button>
      </div>
    </header>

    <div class="flex-1 flex overflow-hidden">
      <!-- 左侧导航 -->
      <aside class="w-16 bg-slate-800 border-r border-slate-700 flex flex-col items-center py-4 gap-2">
        <router-link to="/" class="w-12 h-12 flex items-center justify-center rounded-xl bg-blue-600 text-white"
          title="首页">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </router-link>
        <router-link to="/data"
          class="w-12 h-12 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          title="数据管理">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </router-link>
      </aside>

      <!-- 主内容区 -->
      <main class="flex-1 flex">
        <!-- Cesium 地图区域 -->
        <div class="flex-1 relative">
          <CesiumViewer :enable-lighting="enableLighting" :depth-test-against-terrain="depthTestAgainstTerrain"
            :timeline="showTimeline" :animation="showAnimation" @click-sensor="handleSensorClick" />

          <!-- 传感器图例 -->
          <div class="absolute top-4 left-4 bg-slate-800/90 backdrop-blur rounded-lg p-3 border border-slate-700">
            <div class="text-xs text-slate-400 mb-2">传感器类型</div>
            <div class="flex flex-col gap-1.5 text-sm">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-green-500"></span>
                <span class="text-white">引张线 (EX): {{ sensorsByType.EX }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-blue-500"></span>
                <span class="text-white">静力水准 (TC): {{ sensorsByType.TC }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-yellow-500"></span>
                <span class="text-white">倒垂线 (IP): {{ sensorsByType.IP }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧面板 -->
        <aside class="w-80 bg-slate-800 border-l border-slate-700 overflow-y-auto">
          <!-- 统计数据 -->
          <div class="p-4 border-b border-slate-700">
            <h2 class="text-sm font-medium text-slate-400 mb-3">实时统计</h2>
            <div class="grid grid-cols-2 gap-3">
              <div class="bg-slate-900 rounded-lg p-3">
                <div class="text-2xl font-bold text-white">{{ sensorStore.totalPoints }}</div>
                <div class="text-xs text-slate-500">总测点数</div>
              </div>
              <div class="bg-slate-900 rounded-lg p-3">
                <div class="text-2xl font-bold text-green-400">{{ sensorStore.onlinePoints }}</div>
                <div class="text-xs text-slate-500">在线</div>
              </div>
              <div class="bg-slate-900 rounded-lg p-3">
                <div class="text-2xl font-bold text-red-400">{{ sensorStore.offlinePoints }}</div>
                <div class="text-xs text-slate-500">离线</div>
              </div>
              <div class="bg-slate-900 rounded-lg p-3">
                <div class="text-2xl font-bold text-blue-400">47</div>
                <div class="text-xs text-slate-500">今日数据</div>
              </div>
            </div>
          </div>

          <!-- Cesium 设置 -->
          <div class="p-4">
            <h2 class="text-sm font-medium text-slate-400 mb-3">Cesium 设置</h2>
            <div class="space-y-3">
              <label class="flex items-center justify-between cursor-pointer">
                <span class="text-sm text-slate-300">启用光照效果</span>
                <input type="checkbox" v-model="enableLighting"
                  class="w-5 h-5 rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500" />
              </label>
              <label class="flex items-center justify-between cursor-pointer">
                <span class="text-sm text-slate-300">深度测试</span>
                <input type="checkbox" v-model="depthTestAgainstTerrain"
                  class="w-5 h-5 rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500" />
              </label>
              <label class="flex items-center justify-between cursor-pointer">
                <span class="text-sm text-slate-300">显示时间轴</span>
                <input type="checkbox" v-model="showTimeline"
                  class="w-5 h-5 rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500" />
              </label>
              <label class="flex items-center justify-between cursor-pointer">
                <span class="text-sm text-slate-300">显示动画控件</span>
                <input type="checkbox" v-model="showAnimation"
                  class="w-5 h-5 rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500" />
              </label>
            </div>
          </div>
        </aside>
      </main>
    </div>
  </div>
</template>
