import client from './client';

// 引张线数据
export interface ExtensometerData {
  sensor_code: string;
  ob_time: string;
  reservoir_level?: number;
  value: number;
}

// 静力水准数据
export interface HydrostaticLevelData {
  sensor_code: string;
  ob_time: string;
  value: number;
}

// 倒垂线数据
export interface InvertedPlumbLineData {
  sensor_code: string;
  ob_time: string;
  reservoir_level?: number;
  lr_value: number;
  ud_value: number;
}

export const dataApi = {
  // 获取引张线数据
  async getExtensometer(params: {
    id: string;
    limit?: number;
    offset?: number;
    start?: string;
    end?: string;
  }): Promise<ExtensometerData[]> {
    const response = await client.get(`/data/${params.id}/extensometer`, {
      params: { limit: params.limit, offset: params.offset, start: params.start, end: params.end },
    });
    return response.data.data;
  },

  // 新增引张线数据
  async addExtensometer(data: {
    sensor_code: string;
    observation_time: string;
    reservoir_level?: number;
    value: number;
  }) {
    const response = await client.post(`/data/${data.sensor_code}/extensometer`, {
      observation_time: data.observation_time,
      reservoir_level: data.reservoir_level,
      value: data.value,
    });
    return response.data;
  },

  // 获取静力水准数据
  async getHydrostaticLevel(params: {
    id: string;
    limit?: number;
    offset?: number;
    start?: string;
    end?: string;
  }): Promise<HydrostaticLevelData[]> {
    const response = await client.get(`/data/${params.id}/hydrostatic-level`, {
      params: { limit: params.limit, offset: params.offset, start: params.start, end: params.end },
    });
    return response.data.data;
  },

  // 新增静力水准数据
  async addHydrostaticLevel(data: {
    sensor_code: string;
    observation_time: string;
    value: number;
  }) {
    const response = await client.post(`/data/${data.sensor_code}/hydrostatic-level`, {
      observation_time: data.observation_time,
      value: data.value,
    });
    return response.data;
  },

  // 获取倒垂线数据
  async getInvertedPlumbLine(params: {
    id: string;
    limit?: number;
    offset?: number;
    start?: string;
    end?: string;
  }): Promise<InvertedPlumbLineData[]> {
    const response = await client.get(`/data/${params.id}/inverted-plumb-line`, {
      params: { limit: params.limit, offset: params.offset, start: params.start, end: params.end },
    });
    return response.data.data;
  },

  // 新增倒垂线数据
  async addInvertedPlumbLine(data: {
    sensor_code: string;
    observation_time: string;
    reservoir_level?: number;
    lr_value: number;
    ud_value: number;
  }) {
    const response = await client.post(`/data/${data.sensor_code}/inverted-plumb-line`, {
      observation_time: data.observation_time,
      reservoir_level: data.reservoir_level,
      lr_value: data.lr_value,
      ud_value: data.ud_value,
    });
    return response.data;
  },
};
