<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useSensorStore } from '@/stores/sensor';
import * as echarts from 'echarts';
import type { ECharts } from 'echarts';

const router = useRouter();
const authStore = useAuthStore();
const sensorStore = useSensorStore();

// 视图模式
const viewMode = ref<'chart' | 'table'>('chart');

// 时间范围
const startDate = ref('');
const endDate = ref('');

// 新增数据弹窗
const showAddDialog = ref(false);
const addForm = ref({
  observation_time: '',
  reservoir_level: undefined as number | undefined,
  value: undefined as number | undefined,
  lr_value: undefined as number | undefined,
  ud_value: undefined as number | undefined,
});

// ECharts 实例
let chartInstance: ECharts | null = null;
const chartRef = ref<HTMLDivElement | null>(null);

// 当前传感器类型和编码
const currentSensorType = computed(() => {
  if (!sensorStore.selectedSensor) return null;
  return sensorStore.selectedSensor.sensor_type as 'EX' | 'TC' | 'IP';
});

// 筛选后的测点列表
const filteredPoints = computed(() => {
  if (sensorStore.selectedSensorType === 'all') {
    return sensorStore.points;
  }
  return sensorStore.points.filter(p => p.sensor_type === sensorStore.selectedSensorType);
});

// 根据传感器类型获取对应数据
const currentData = computed(() => {
  if (!sensorStore.selectedSensor) return [];
  const type = sensorStore.selectedSensor.sensor_type;
  if (type === 'EX') return sensorStore.extensometerData;
  if (type === 'TC') return sensorStore.hydrostaticLevelData;
  if (type === 'IP') return sensorStore.invertedPlumbLineData;
  return [];
});

// 退出登录
function logout() {
  authStore.logout();
  router.push('/login');
}

// 选择传感器
async function selectPoint(point: typeof sensorStore.points[0]) {
  sensorStore.selectSensor(point);
  await fetchData();
}

// 获取监测数据
async function fetchData() {
  if (!sensorStore.selectedSensor) return;

  const code = sensorStore.selectedSensor.code;
  const type = sensorStore.selectedSensor.sensor_type as 'EX' | 'TC' | 'IP';

  await sensorStore.fetchData(type, code, startDate.value || undefined, endDate.value || undefined);

  if (viewMode.value === 'chart') {
    await nextTick();
    renderChart();
  }
}

// 渲染图表
function renderChart() {
  if (!chartRef.value || !sensorStore.selectedSensor) return;

  if (chartInstance) {
    chartInstance.dispose();
  }

  chartInstance = echarts.init(chartRef.value);
  const data = currentData.value;
  const type = sensorStore.selectedSensor.sensor_type;

  let option: echarts.EChartsOption;

  if (type === 'IP') {
    // 倒垂线有左右和上下两个值
    const ipData = data as any[];
    option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        borderColor: '#334155',
        textStyle: { color: '#f1f5f9' },
      },
      legend: {
        data: ['左右位移', '上下游位移'],
        textStyle: { color: '#94a3b8' },
        top: 10,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: ipData.map(d => d.ob_time),
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#94a3b8' },
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#334155' } },
      },
      series: [
        {
          name: '左右位移',
          type: 'line',
          data: ipData.map(d => d.lr_value),
          smooth: true,
          lineStyle: { color: '#22c55e', width: 2 },
          itemStyle: { color: '#22c55e' },
        },
        {
          name: '上下游位移',
          type: 'line',
          data: ipData.map(d => d.ud_value),
          smooth: true,
          lineStyle: { color: '#f59e0b', width: 2 },
          itemStyle: { color: '#f59e0b' },
        },
      ],
    };
  } else {
    // 引张线和静力水准只有一个值
    const normalData = data as any[];
    option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        borderColor: '#334155',
        textStyle: { color: '#f1f5f9' },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: normalData.map(d => d.ob_time),
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#94a3b8' },
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#334155' } },
      },
      series: [
        {
          type: 'line',
          data: normalData.map(d => d.value),
          smooth: true,
          lineStyle: { color: '#3b82f6', width: 2 },
          itemStyle: { color: '#3b82f6' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0)' },
            ]),
          },
        },
      ],
    };
  }

  chartInstance.setOption(option);
}

// 打开新增数据弹窗
function openAddDialog() {
  if (!sensorStore.selectedSensor) return;

  addForm.value = {
    observation_time: new Date().toISOString().slice(0, 16),
    reservoir_level: undefined,
    value: undefined,
    lr_value: undefined,
    ud_value: undefined,
  };
  showAddDialog.value = true;
}

// 提交新增数据
async function submitAddData() {
  if (!sensorStore.selectedSensor) return;

  const type = sensorStore.selectedSensor.sensor_type;

  try {
    if (type === 'EX') {
      await import('@/api/data').then(({ dataApi }) =>
        dataApi.addExtensometer({
          sensor_code: sensorStore.selectedSensor!.code,
          observation_time: addForm.value.observation_time,
          reservoir_level: addForm.value.reservoir_level,
          value: addForm.value.value!,
        })
      );
    } else if (type === 'TC') {
      await import('@/api/data').then(({ dataApi }) =>
        dataApi.addHydrostaticLevel({
          sensor_code: sensorStore.selectedSensor!.code,
          observation_time: addForm.value.observation_time,
          value: addForm.value.value!,
        })
      );
    } else if (type === 'IP') {
      await import('@/api/data').then(({ dataApi }) =>
        dataApi.addInvertedPlumbLine({
          sensor_code: sensorStore.selectedSensor!.code,
          observation_time: addForm.value.observation_time,
          reservoir_level: addForm.value.reservoir_level,
          lr_value: addForm.value.lr_value!,
          ud_value: addForm.value.ud_value!,
        })
      );
    }

    showAddDialog.value = false;
    await fetchData();
  } catch (error) {
    console.error('新增数据失败:', error);
  }
}

// 切换传感器类型
function setType(type: 'all' | 'EX' | 'TC' | 'IP') {
  sensorStore.setSensorType(type);
}

// 监听视图变化
watch(viewMode, async (newMode) => {
  if (newMode === 'chart') {
    await nextTick();
    renderChart();
  }
});

// 窗口大小变化时调整图表
window.addEventListener('resize', () => {
  chartInstance?.resize();
});

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
        <span class="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">数据管理</span>
      </div>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2 text-slate-400">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>{{ authStore.user?.username || '用户' }}</span>
        </div>
        <button
          @click="logout"
          class="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
        >
          退出
        </button>
      </div>
    </header>

    <div class="flex-1 flex overflow-hidden">
      <!-- 左侧导航 -->
      <aside class="w-16 bg-slate-800 border-r border-slate-700 flex flex-col items-center py-4 gap-2">
        <router-link
          to="/"
          class="w-12 h-12 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          title="首页"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </router-link>
        <router-link
          to="/data"
          class="w-12 h-12 flex items-center justify-center rounded-xl bg-blue-600 text-white"
          title="数据管理"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </router-link>
      </aside>

      <!-- 主内容区 -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- 工具栏 -->
        <div class="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center gap-4 flex-wrap">
          <!-- 新增数据按钮 -->
          <button
            @click="openAddDialog"
            :disabled="!sensorStore.selectedSensor"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            新增数据
          </button>

          <!-- 传感器类型筛选 -->
          <div class="flex bg-slate-900 rounded-lg p-1">
            <button
              v-for="type in ['all', 'EX', 'TC', 'IP']"
              :key="type"
              @click="setType(type as any)"
              :class="[
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                sensorStore.selectedSensorType === type
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              ]"
            >
              {{ type === 'all' ? '全部' : type }}
            </button>
          </div>

          <!-- 传感器选择 -->
          <select
            :value="sensorStore.selectedSensor?.code || ''"
            @change="(e) => {
              const point = sensorStore.points.find(p => p.code === (e.target as HTMLSelectElement).value);
              if (point) selectPoint(point);
            }"
            class="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">请选择传感器</option>
            <option v-for="point in filteredPoints" :key="point.code" :value="point.code">
              {{ point.code }} ({{ point.section }})
            </option>
          </select>

          <!-- 时间范围 -->
          <div class="flex items-center gap-2">
            <input
              type="datetime-local"
              v-model="startDate"
              class="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            />
            <span class="text-slate-500">至</span>
            <input
              type="datetime-local"
              v-model="endDate"
              class="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            />
            <button
              @click="fetchData"
              class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg"
            >
              查询
            </button>
          </div>
        </div>

        <!-- 内容区 -->
        <div class="flex-1 overflow-hidden p-4">
          <!-- 视图切换 -->
          <div class="flex bg-slate-800 rounded-lg p-1 w-fit mb-4">
            <button
              @click="viewMode = 'chart'"
              :class="[
                'px-4 py-2 text-sm rounded-md transition-colors',
                viewMode === 'chart' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              ]"
            >
              图表视图
            </button>
            <button
              @click="viewMode = 'table'"
              :class="[
                'px-4 py-2 text-sm rounded-md transition-colors',
                viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              ]"
            >
              表格视图
            </button>
          </div>

          <!-- 图表视图 -->
          <div v-if="viewMode === 'chart'" class="h-full">
            <div v-if="!sensorStore.selectedSensor" class="h-full flex items-center justify-center text-slate-500">
              请从左侧选择一个传感器查看数据
            </div>
            <div v-else class="h-full bg-slate-800 rounded-xl p-4">
              <div ref="chartRef" class="w-full h-full min-h-[400px]"></div>
            </div>
          </div>

          <!-- 表格视图 -->
          <div v-else class="h-full bg-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div v-if="!sensorStore.selectedSensor" class="flex-1 flex items-center justify-center text-slate-500">
              请从左侧选择一个传感器查看数据
            </div>
            <div v-else class="flex-1 overflow-auto">
              <table class="w-full text-sm">
                <thead class="bg-slate-900 sticky top-0">
                  <tr>
                    <th class="px-4 py-3 text-left text-slate-400 font-medium">传感器编码</th>
                    <th class="px-4 py-3 text-left text-slate-400 font-medium">观测时间</th>
                    <th v-if="currentSensorType === 'EX' || currentSensorType === 'IP'" class="px-4 py-3 text-left text-slate-400 font-medium">水位</th>
                    <th v-if="currentSensorType === 'IP'" class="px-4 py-3 text-left text-slate-400 font-medium">左右位移</th>
                    <th v-if="currentSensorType === 'IP'" class="px-4 py-3 text-left text-slate-400 font-medium">上下游位移</th>
                    <th v-if="currentSensorType !== 'IP'" class="px-4 py-3 text-left text-slate-400 font-medium">监测值</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(item, index) in currentData"
                    :key="index"
                    class="border-t border-slate-700 hover:bg-slate-700/50"
                  >
                    <td class="px-4 py-3 text-white">{{ (item as any).sensor_code }}</td>
                    <td class="px-4 py-3 text-slate-300">{{ (item as any).ob_time }}</td>
                    <td v-if="currentSensorType === 'EX' || currentSensorType === 'IP'" class="px-4 py-3 text-slate-300">
                      {{ (item as any).reservoir_level ?? '-' }}
                    </td>
                    <td v-if="currentSensorType === 'IP'" class="px-4 py-3 text-slate-300">{{ (item as any).lr_value }}</td>
                    <td v-if="currentSensorType === 'IP'" class="px-4 py-3 text-slate-300">{{ (item as any).ud_value }}</td>
                    <td v-if="currentSensorType !== 'IP'" class="px-4 py-3 text-slate-300">{{ (item as any).value }}</td>
                  </tr>
                </tbody>
              </table>
              <div v-if="currentData.length === 0" class="p-8 text-center text-slate-500">
                暂无数据
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 新增数据弹窗 -->
    <div v-if="showAddDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
        <h3 class="text-lg font-semibold text-white mb-4">新增数据 - {{ sensorStore.selectedSensor?.code }}</h3>
        <form @submit.prevent="submitAddData" class="space-y-4">
          <div>
            <label class="block text-sm text-slate-400 mb-2">观测时间</label>
            <input
              type="datetime-local"
              v-model="addForm.observation_time"
              required
              class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div v-if="currentSensorType === 'EX' || currentSensorType === 'IP'">
            <label class="block text-sm text-slate-400 mb-2">水库水位</label>
            <input
              type="number"
              step="0.01"
              v-model.number="addForm.reservoir_level"
              class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div v-if="currentSensorType === 'IP'">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-slate-400 mb-2">左右位移</label>
                <input
                  type="number"
                  step="0.001"
                  v-model.number="addForm.lr_value"
                  required
                  class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label class="block text-sm text-slate-400 mb-2">上下游位移</label>
                <input
                  type="number"
                  step="0.001"
                  v-model.number="addForm.ud_value"
                  required
                  class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div v-if="currentSensorType !== 'IP'">
            <label class="block text-sm text-slate-400 mb-2">监测值</label>
            <input
              type="number"
              step="0.001"
              v-model.number="addForm.value"
              required
              class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div class="flex justify-end gap-3 pt-4">
            <button
              type="button"
              @click="showAddDialog = false"
              class="px-4 py-2 text-slate-300 hover:text-white"
            >
              取消
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              提交
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
