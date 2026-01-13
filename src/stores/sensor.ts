import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { pointsApi, type SensorPoint, type SensorStats } from '@/api/points';
import { dataApi, type ExtensometerData, type HydrostaticLevelData, type InvertedPlumbLineData } from '@/api/data';

export const useSensorStore = defineStore('sensor', () => {
  // 测点数据
  const points = ref<SensorPoint[]>([]);
  const pointsLoading = ref(false);

  // 当前选中的传感器类型
  const selectedSensorType = ref<'all' | 'EX' | 'TC' | 'IP'>('all');

  // 当前选中的传感器
  const selectedSensor = ref<SensorPoint | null>(null);

  // 传感器统计数据
  const sensorStats = ref<SensorStats | null>(null);
  const statsLoading = ref(false);

  // 监测数据（图表用）
  const extensometerData = ref<ExtensometerData[]>([]);
  const hydrostaticLevelData = ref<HydrostaticLevelData[]>([]);
  const invertedPlumbLineData = ref<InvertedPlumbLineData[]>([]);
  const dataLoading = ref(false);

  // 表格数据（全量，用于前端分页）
  const tableExtensometerData = ref<ExtensometerData[]>([]);
  const tableHydrostaticLevelData = ref<HydrostaticLevelData[]>([]);
  const tableInvertedPlumbLineData = ref<InvertedPlumbLineData[]>([]);

  // 统计数据
  const totalPoints = computed(() => points.value.length);
  const onlinePoints = computed(() => points.value.filter(p => p.status === 1).length);
  const offlinePoints = computed(() => points.value.filter(p => p.status !== 1).length);

  const exPoints = computed(() => points.value.filter(p => p.sensor_type === 'EX'));
  const tcPoints = computed(() => points.value.filter(p => p.sensor_type === 'TC'));
  const ipPoints = computed(() => points.value.filter(p => p.sensor_type === 'IP'));

  // 获取所有测点
  async function fetchPoints() {
    pointsLoading.value = true;
    try {
      points.value = await pointsApi.getPoints();
    } finally {
      pointsLoading.value = false;
    }
  }

  // 获取测点统计数据
  async function fetchSensorStats(code: string) {
    statsLoading.value = true;
    try {
      sensorStats.value = await pointsApi.getStats(code);
    } finally {
      statsLoading.value = false;
    }
  }

  // 获取监测数据
  async function fetchData(type: 'EX' | 'TC' | 'IP', code: string, start?: string, end?: string, limit?: number, offset?: number) {
    dataLoading.value = true;
    try {
      if (type === 'EX') {
        extensometerData.value = await dataApi.getExtensometer({ id: code, start, end, limit, offset });
      } else if (type === 'TC') {
        hydrostaticLevelData.value = await dataApi.getHydrostaticLevel({ id: code, start, end, limit, offset });
      } else if (type === 'IP') {
        invertedPlumbLineData.value = await dataApi.getInvertedPlumbLine({ id: code, start, end, limit, offset });
      }
    } finally {
      dataLoading.value = false;
    }
  }

  // 增量获取监测数据（追加到现有数据）
  async function fetchMoreData(type: 'EX' | 'TC' | 'IP', code: string, start?: string, end?: string, limit?: number, offset?: number) {
    dataLoading.value = true;
    try {
      let newData: any[] = [];
      if (type === 'EX') {
        newData = await dataApi.getExtensometer({ id: code, start, end, limit, offset });
        extensometerData.value = [...extensometerData.value, ...newData];
      } else if (type === 'TC') {
        newData = await dataApi.getHydrostaticLevel({ id: code, start, end, limit, offset });
        hydrostaticLevelData.value = [...hydrostaticLevelData.value, ...newData];
      } else if (type === 'IP') {
        newData = await dataApi.getInvertedPlumbLine({ id: code, start, end, limit, offset });
        invertedPlumbLineData.value = [...invertedPlumbLineData.value, ...newData];
      }
    } finally {
      dataLoading.value = false;
    }
  }

  // 分页获取监测数据（替换数据）
  async function fetchPageData(type: 'EX' | 'TC' | 'IP', code: string, limit: number, offset: number, start?: string, end?: string) {
    dataLoading.value = true;
    try {
      if (type === 'EX') {
        extensometerData.value = await dataApi.getExtensometer({ id: code, start, end, limit, offset });
      } else if (type === 'TC') {
        hydrostaticLevelData.value = await dataApi.getHydrostaticLevel({ id: code, start, end, limit, offset });
      } else if (type === 'IP') {
        invertedPlumbLineData.value = await dataApi.getInvertedPlumbLine({ id: code, start, end, limit, offset });
      }
    } finally {
      dataLoading.value = false;
    }
  }

  // 获取表格数据（用于前端分页）
  async function fetchTableData(type: 'EX' | 'TC' | 'IP', code: string, limit: number, start?: string, end?: string) {
    dataLoading.value = true;
    try {
      if (type === 'EX') {
        tableExtensometerData.value = await dataApi.getExtensometer({ id: code, start, end, limit });
      } else if (type === 'TC') {
        tableHydrostaticLevelData.value = await dataApi.getHydrostaticLevel({ id: code, start, end, limit });
      } else if (type === 'IP') {
        tableInvertedPlumbLineData.value = await dataApi.getInvertedPlumbLine({ id: code, start, end, limit });
      }
    } finally {
      dataLoading.value = false;
    }
  }

  // 选择传感器
  function selectSensor(point: SensorPoint | null) {
    selectedSensor.value = point;
  }

  // 设置传感器类型筛选
  function setSensorType(type: 'all' | 'EX' | 'TC' | 'IP') {
    selectedSensorType.value = type;
  }

  return {
    points,
    pointsLoading,
    selectedSensorType,
    selectedSensor,
    sensorStats,
    statsLoading,
    extensometerData,
    hydrostaticLevelData,
    invertedPlumbLineData,
    dataLoading,
    tableExtensometerData,
    tableHydrostaticLevelData,
    tableInvertedPlumbLineData,
    totalPoints,
    onlinePoints,
    offlinePoints,
    exPoints,
    tcPoints,
    ipPoints,
    fetchPoints,
    fetchSensorStats,
    fetchData,
    fetchMoreData,
    fetchPageData,
    fetchTableData,
    selectSensor,
    setSensorType,
  };
});
