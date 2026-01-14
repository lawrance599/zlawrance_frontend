<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useSensorStore } from '@/stores/sensor';
import { pointsApi } from '@/api/points';
import { init, graphic, use } from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';

// 注册 ECharts 组件
use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const sensorStore = useSensorStore();

// 有效日期范围（first_observation到last_observation）
const validDateRange = ref({
  min: '',
  max: ''
});

// 图表展示点数（默认20）
const chartLimit = ref(20);

// 分页状态（表格）
const currentPage = ref(1);
const pageSize = 13;

// 表格当前页数据
const tablePageData = computed(() => {
  if (!sensorStore.selectedSensor) return [];
  const type = sensorStore.selectedSensor.sensor_type;
  const start = (currentPage.value - 1) * pageSize;
  const end = start + pageSize;

  if (type === 'EX') return sensorStore.tableExtensometerData.slice(start, end);
  if (type === 'TC') return sensorStore.tableHydrostaticLevelData.slice(start, end);
  if (type === 'IP') return sensorStore.tableInvertedPlumbLineData.slice(start, end);
  return [];
});

// 表格总数据量
const tableTotalRecords = computed(() => {
  if (!sensorStore.selectedSensor) return 0;
  const type = sensorStore.selectedSensor.sensor_type;
  if (type === 'EX') return sensorStore.tableExtensometerData.length;
  if (type === 'TC') return sensorStore.tableHydrostaticLevelData.length;
  if (type === 'IP') return sensorStore.tableInvertedPlumbLineData.length;
  return 0;
});

// 分页总页数
const totalPages = computed(() => {
  if (tableTotalRecords.value === 0) return 1;
  return Math.ceil(tableTotalRecords.value / pageSize);
});

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
let chartInstance: any = null;
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
  await selectPointWithAutoLoad(point);
}

// 自动加载数据（包含30天范围和日期限制）
async function selectPointWithAutoLoad(point: typeof sensorStore.points[0]) {
  sensorStore.selectSensor(point);

  // 重置分页
  currentPage.value = 1;

  try {
    const stats = await pointsApi.getStats(point.code);
    sensorStore.sensorStats = stats;

    if (stats?.last_observation && stats?.first_observation) {
      const lastObs = new Date(stats.last_observation);
      const firstObs = new Date(stats.first_observation);
      const thirtyDaysAgo = new Date(lastObs.getTime() - 30 * 24 * 60 * 60 * 1000);

      // 设置有效日期范围（first_observation到last_observation）
      validDateRange.value.min = formatDateTime(firstObs);
      validDateRange.value.max = formatDateTime(lastObs);

      // 限制30天范围不超出first_observation
      const startCalc = firstObs > thirtyDaysAgo ? firstObs : thirtyDaysAgo;
      startDate.value = formatDateTime(startCalc);
      endDate.value = formatDateTime(lastObs);

      await fetchData();
      await fetchTableData();
    } else {
      validDateRange.value = { min: '', max: '' };
      await fetchData();
      await fetchTableData();
    }
  } catch (error) {
    console.error('获取测点统计数据失败:', error);
    validDateRange.value = { min: '', max: '' };
    await fetchData();
    await fetchTableData();
  }
}

// 辅助函数：格式化日期时间为datetime-local格式
function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

// 自动补全秒
function formatWithSeconds(dateStr: string): string {
  if (!dateStr) return dateStr;
  if (dateStr.length === 16) {
    return dateStr + ':00';
  }
  return dateStr;
}

// 获取监测数据
async function fetchData() {
  if (!sensorStore.selectedSensor) return;

  const code = sensorStore.selectedSensor.code;
  const type = sensorStore.selectedSensor.sensor_type as 'EX' | 'TC' | 'IP';

  const formattedStart = formatWithSeconds(startDate.value);
  const formattedEnd = formatWithSeconds(endDate.value);

  await sensorStore.fetchData(type, code, formattedStart || undefined, formattedEnd || undefined, chartLimit.value);

  if (viewMode.value === 'chart') {
    await nextTick();
    renderChart();
  }
}

// 加载图表数据（全量替换）
async function loadChartData() {
  if (!sensorStore.selectedSensor) return;

  const code = sensorStore.selectedSensor.code;
  const type = sensorStore.selectedSensor.sensor_type as 'EX' | 'TC' | 'IP';

  const formattedStart = formatWithSeconds(startDate.value);
  const formattedEnd = formatWithSeconds(endDate.value);

  await sensorStore.fetchData(type, code, formattedStart || undefined, formattedEnd || undefined, chartLimit.value);

  await nextTick();
  renderChart();
}

// 获取表格数据
async function fetchTableData() {
  if (!sensorStore.selectedSensor) return;

  const code = sensorStore.selectedSensor.code;
  const type = sensorStore.selectedSensor.sensor_type as 'EX' | 'TC' | 'IP';

  const formattedStart = formatWithSeconds(startDate.value);
  const formattedEnd = formatWithSeconds(endDate.value);

  // 确保 sensorStats 加载完成
  if (!sensorStore.sensorStats) {
    const stats = await pointsApi.getStats(code);
    sensorStore.sensorStats = stats;
  }

  const limit = sensorStore.sensorStats?.total_records;
  await sensorStore.fetchTableData(type, code, limit, formattedStart || undefined, formattedEnd || undefined);
}

// 渲染图表
function renderChart() {
  if (!chartRef.value || !sensorStore.selectedSensor) return;

  if (chartInstance) {
    chartInstance.dispose();
  }

  const instance = init(chartRef.value);
  chartInstance = instance;
  const data = currentData.value;
  const type = sensorStore.selectedSensor.sensor_type;

  let option: EChartsOption;

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
            color: new graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0)' },
            ]),
          },
        },
      ],
    };
  }

  instance.setOption(option);
}

// 打开新增数据弹窗
function openAddDialog() {
  if (!sensorStore.selectedSensor) return;

  addForm.value = {
    observation_time: new Date().toISOString().slice(0, 19),
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
    // 更新测点统计信息（包含 last_observation）
    const stats = await pointsApi.getStats(sensorStore.selectedSensor!.code);
    sensorStore.sensorStats = stats;
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
  } else if (newMode === 'table') {
    await fetchTableData();
  }
});

// 监听时间范围变化，重新获取表格数据
watch([startDate, endDate], async () => {
  if (viewMode.value === 'table') {
    currentPage.value = 1;
    await fetchTableData();
  }
});

// 窗口大小变化时调整图表
window.addEventListener('resize', () => {
  chartInstance?.resize();
});

// 监听图表点数变化（全量加载）
watch(chartLimit, async () => {
  await loadChartData();
});

// 监听页码变化（表格分页）
watch(currentPage, async () => {
  await fetchTableData();
});

onMounted(async () => {
  sensorStore.fetchPoints();
  // 检查路由参数中的sensorCode
  const sensorCode = route.query.sensorCode as string;
  if (sensorCode) {
    // 等待测点数据加载完成
    await sensorStore.fetchPoints();
    const point = sensorStore.points.find(p => p.code === sensorCode);
    if (point) {
      await selectPointWithAutoLoad(point);
    }
  }
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
        <router-link to="/"
          class="w-12 h-12 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          title="首页">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </router-link>
        <router-link to="/data" class="w-12 h-12 flex items-center justify-center rounded-xl bg-blue-600 text-white"
          title="数据管理">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </router-link>
      </aside>

      <!-- 主内容区 -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- 工具栏 -->
        <div class="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center gap-4 flex-wrap">
          <!-- 新增数据按钮 -->
          <button @click="openAddDialog" :disabled="!sensorStore.selectedSensor"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            新增数据
          </button>

          <!-- 传感器类型筛选 -->
          <div class="flex bg-slate-900 rounded-lg p-1">
            <button v-for="type in ['all', 'EX', 'TC', 'IP']" :key="type" @click="setType(type as any)" :class="[
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              sensorStore.selectedSensorType === type
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            ]">
              {{ type === 'all' ? '全部' : type }}
            </button>
          </div>

          <!-- 传感器选择 -->
          <select :value="sensorStore.selectedSensor?.code || ''" @change="(e) => {
            const point = sensorStore.points.find(p => p.code === (e.target as HTMLSelectElement).value);
            if (point) selectPoint(point);
          }"
            class="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500">
            <option value="">请选择传感器</option>
            <option v-for="point in filteredPoints" :key="point.code" :value="point.code">
              {{ point.code }} ({{ point.section }})
            </option>
          </select>

          <!-- 时间范围 -->
          <div class="flex items-center gap-2">
            <input type="datetime-local" v-model="startDate" :min="validDateRange.min" :max="validDateRange.max"
              step="1"
              class="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
            <span class="text-slate-500">至</span>
            <input type="datetime-local" v-model="endDate" :min="validDateRange.min" :max="validDateRange.max" step="1"
              class="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
            <button @click="loadChartData"
              class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg">
              查询
            </button>
          </div>
        </div>

        <!-- 内容区 -->
        <div class="flex-1 overflow-hidden p-4">
          <!-- 视图切换 -->
          <div class="flex bg-slate-800 rounded-lg p-1 w-fit mb-4">
            <button @click="viewMode = 'chart'" :class="[
              'px-4 py-2 text-sm rounded-md transition-colors',
              viewMode === 'chart' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            ]">
              图表视图
            </button>
            <button @click="viewMode = 'table'" :class="[
              'px-4 py-2 text-sm rounded-md transition-colors',
              viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            ]">
              表格视图
            </button>
          </div>

          <!-- 图表视图 -->
          <div v-if="viewMode === 'chart'" class="h-full">
            <div v-if="!sensorStore.selectedSensor" class="h-full flex items-center justify-center text-slate-500">
              请从左侧选择一个传感器查看数据
            </div>
            <div v-else class="h-full bg-slate-800 rounded-xl p-4 relative">
              <!-- 显示点数控制 -->
              <div class="absolute top-4 right-4 flex items-center gap-2 z-10">
                <span class="text-xs text-slate-400">最多显示点数:</span>
                <input type="number" v-model.number="chartLimit" min="20" step="10"
                  class="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm" />
              </div>
              <div ref="chartRef" class="w-full h-full min-h-[400px]"></div>
            </div>
          </div>

          <!-- 表格视图 -->
          <div v-else class="h-full bg-slate-800 rounded-xl overflow-hidden flex flex-col relative">
            <div v-if="!sensorStore.selectedSensor" class="flex-1 flex items-center justify-center text-slate-500">
              请从左侧选择一个传感器查看数据
            </div>
            <div v-else class="flex-1 overflow-auto p-0">
              <table class="w-full text-sm">
                <thead class="bg-slate-900 sticky top-0">
                  <tr>
                    <th class="px-4 py-3 text-left text-slate-400 font-medium">传感器编码</th>
                    <th class="px-4 py-3 text-left text-slate-400 font-medium">观测时间</th>
                    <th v-if="currentSensorType === 'EX' || currentSensorType === 'IP'"
                      class="px-4 py-3 text-left text-slate-400 font-medium">水位</th>
                    <th v-if="currentSensorType === 'IP'" class="px-4 py-3 text-left text-slate-400 font-medium">左右位移
                    </th>
                    <th v-if="currentSensorType === 'IP'" class="px-4 py-3 text-left text-slate-400 font-medium">上下游位移
                    </th>
                    <th v-if="currentSensorType !== 'IP'" class="px-4 py-3 text-left text-slate-400 font-medium">监测值
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in tablePageData" :key="index"
                    class="border-t border-slate-700 hover:bg-slate-700/50">
                    <td class="px-4 py-3 text-white">{{ (item as any).sensor_code }}</td>
                    <td class="px-4 py-3 text-slate-300">{{ (item as any).ob_time }}</td>
                    <td v-if="currentSensorType === 'EX' || currentSensorType === 'IP'"
                      class="px-4 py-3 text-slate-300">
                      {{ (item as any).reservoir_level ?? '-' }}
                    </td>
                    <td v-if="currentSensorType === 'IP'" class="px-4 py-3 text-slate-300">{{ (item as any).lr_value }}
                    </td>
                    <td v-if="currentSensorType === 'IP'" class="px-4 py-3 text-slate-300">{{ (item as any).ud_value }}
                    </td>
                    <td v-if="currentSensorType !== 'IP'" class="px-4 py-3 text-slate-300">{{ (item as any).value }}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div v-if="tablePageData.length === 0" class="p-8 text-center text-slate-500">
                暂无数据
              </div>
              <!-- 分页控件 -->
              <div
                class="sticky bottom-0 flex items-center justify-between px-4 py-3 bg-slate-900 border-t border-slate-700">
                <span class="text-sm text-slate-400">
                  共 {{ tableTotalRecords }} 条
                </span>
                <div class="flex items-center gap-2">
                  <button @click="currentPage--" :disabled="currentPage === 1"
                    class="px-3 py-1 bg-slate-700 disabled:opacity-50 text-white text-sm rounded">
                    上一页
                  </button>
                  <span class="text-sm text-white">
                    {{ currentPage }} / {{ totalPages }}
                  </span>
                  <button @click="currentPage++" :disabled="currentPage === totalPages"
                    class="px-3 py-1 bg-slate-700 disabled:opacity-50 text-white text-sm rounded">
                    下一页
                  </button>
                </div>
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
            <input type="datetime-local" v-model="addForm.observation_time" step="1" required
              class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500" />
          </div>

          <div v-if="currentSensorType === 'EX' || currentSensorType === 'IP'">
            <label class="block text-sm text-slate-400 mb-2">水库水位</label>
            <input type="number" step="0.01" v-model.number="addForm.reservoir_level"
              class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500" />
          </div>

          <div v-if="currentSensorType === 'IP'">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-slate-400 mb-2">左右位移</label>
                <input type="number" step="0.001" v-model.number="addForm.lr_value" required
                  class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label class="block text-sm text-slate-400 mb-2">上下游位移</label>
                <input type="number" step="0.001" v-model.number="addForm.ud_value" required
                  class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>

          <div v-if="currentSensorType !== 'IP'">
            <label class="block text-sm text-slate-400 mb-2">监测值</label>
            <input type="number" step="0.001" v-model.number="addForm.value" required
              class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500" />
          </div>

          <div class="flex justify-end gap-3 pt-4">
            <button type="button" @click="showAddDialog = false" class="px-4 py-2 text-slate-300 hover:text-white">
              取消
            </button>
            <button type="submit" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
              提交
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
