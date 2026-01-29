// IndexedDB服务

const DB_NAME = 'ApiMockDB';
const DB_VERSION = 1;
const STORES = {
  MODULES: 'modules',
  APIS: 'apis'
};

class DBService {
  constructor() {
    this.db = null;
    this.init();
  }

  // 初始化数据库
  init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // 创建模块存储
        if (!db.objectStoreNames.contains(STORES.MODULES)) {
          db.createObjectStore(STORES.MODULES, { keyPath: 'id' });
        }
        
        // 创建API存储
        if (!db.objectStoreNames.contains(STORES.APIS)) {
          const apiStore = db.createObjectStore(STORES.APIS, { keyPath: 'id' });
          apiStore.createIndex('moduleId', 'moduleId', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('数据库初始化失败:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  // 获取数据库实例
  async getDB() {
    if (!this.db) {
      await this.init();
    }
    return this.db;
  }

  // 保存模块
  async saveModules(modules) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.MODULES], 'readwrite');
      const store = transaction.objectStore(STORES.MODULES);

      // 清空现有数据
      const clearRequest = store.clear();
      clearRequest.onerror = reject;

      clearRequest.onsuccess = () => {
        // 保存新数据
        modules.forEach(module => {
          store.put(module);
        });

        transaction.oncomplete = () => resolve(true);
        transaction.onerror = reject;
      };
    });
  }

  // 获取所有模块
  async getModules() {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.MODULES], 'readonly');
      const store = transaction.objectStore(STORES.MODULES);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = reject;
    });
  }

  // 保存API配置
  async saveApis(apis) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.APIS], 'readwrite');
      const store = transaction.objectStore(STORES.APIS);

      // 清空现有数据
      const clearRequest = store.clear();
      clearRequest.onerror = reject;

      clearRequest.onsuccess = () => {
        // 保存新数据
        apis.forEach(api => {
          store.put(api);
        });

        transaction.oncomplete = () => resolve(true);
        transaction.onerror = reject;
      };
    });
  }

  // 获取所有API配置
  async getApis() {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.APIS], 'readonly');
      const store = transaction.objectStore(STORES.APIS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = reject;
    });
  }

  // 根据模块ID获取API
  async getApisByModuleId(moduleId) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.APIS], 'readonly');
      const store = transaction.objectStore(STORES.APIS);
      const index = store.index('moduleId');
      const request = index.getAll(moduleId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = reject;
    });
  }

  // 导出所有配置
  async exportConfig() {
    const modules = await this.getModules();
    const apis = await this.getApis();
    return {
      modules,
      apis,
      exportTime: new Date().toISOString()
    };
  }

  // 导入配置
  async importConfig(config) {
    const { modules, apis } = config;
    await this.saveModules(modules);
    await this.saveApis(apis);
    return true;
  }
}

// 导出单例实例
const dbService = new DBService();
export default dbService;