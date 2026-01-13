import client from './client';

export interface SensorPoint {
  code: string;
  sensor_type: 'EX' | 'TC' | 'IP';
  height: number;
  install_date: string;
  section: string;
  status: number;
  updated_at: string;
}

export interface SensorStats {
  sensor_code: string;
  first_observation: string;
  last_observation: string;
  total_records: number;
  max_value: number;
  min_value: number;
  max_observation_time: string;
  min_observation_time: string;
}

export const pointsApi = {
  // 获取所有测点
  async getPoints(params?: {
    limit?: number;
    offset?: number;
    start?: string;
    end?: string;
  }): Promise<SensorPoint[]> {
    const response = await client.get('/points', { params });
    return response.data.data;
  },

  // 获取单个测点详情
  async getPoint(code: string): Promise<SensorPoint> {
    const response = await client.get(`/points/${code}`);
    return response.data.data;
  },

  // 获取测点统计数据
  async getStats(code: string): Promise<SensorStats> {
    const response = await client.get(`/stats/points/${code}`);
    return response.data.data;
  },
};
