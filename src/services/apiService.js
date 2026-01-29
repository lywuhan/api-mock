// API服务
import axios from 'axios';

// 创建axios实例
const apiClient = axios.create({
  baseURL: '',
  timeout: 10000
});

// 错误处理
apiClient.interceptors.response.use(
  response => response.data,
  error => {
    console.error('API请求错误:', error);
    return Promise.reject(error);
  }
);

// API配置管理
export const apiConfigService = {
  // 获取所有配置
  getConfigs: () => {
    return apiClient.get('/admin/configs');
  },
  
  // 更新所有配置
  updateConfigs: (configs) => {
    return apiClient.post('/admin/configs', configs);
  },
  
  // 添加单个配置
  addConfig: (config) => {
    return apiClient.post('/admin/configs/add', config);
  },
  
  // 删除配置
  deleteConfig: (id) => {
    return apiClient.delete(`/admin/configs/${id}`);
  }
};

// 接口测试服务
export const apiTestService = {
  // 测试接口
  testApi: (url, method, data = {}) => {
    return apiClient({
      url,
      method,
      data,
      params: method === 'GET' ? data : {}
    });
  }
};

// 健康检查
export const healthCheckService = {
  check: () => {
    return apiClient.get('/health');
  }
};

export default apiClient;