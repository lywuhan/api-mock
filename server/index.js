const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Mock = require('mockjs');

const app = express();
const port = 3000;

const parseMockData = (mockData) => {
  const processObject = (obj) => {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        if (typeof value === 'object' && value !== null) {
          processObject(value);
        } else if (typeof value === 'string') {
          if (value.startsWith('/') && !key.includes('|') && !key.includes('@')) {
            try {
              const lastSlashIndex = value.lastIndexOf('/');
              if (lastSlashIndex > 0) {
                const pattern = value.slice(1, lastSlashIndex);
                const flags = value.slice(lastSlashIndex + 1);
                if (/^[gimsuy]*$/.test(flags)) {
                  obj[key] = new RegExp(pattern, flags);
                }
              }
            } catch (error) {
            }
          }
        }
      }
    }
  };

  if (mockData === null || mockData === undefined || mockData === '') {
    return {};
  }

  if (typeof mockData === 'object') {
    processObject(mockData);
    return mockData;
  }

  if (typeof mockData !== 'string') {
    return mockData;
  }

  const parseWithFallback = (input) => {
    try {
      return JSON.parse(input);
    } catch (error) {
      const fixed = input.replace(/"\/([^"]*?)\/([gimsuy]*)"/g, (match, body, flags) => {
        const escapedBody = body.replace(/\\/g, '\\\\');
        return `"\/${escapedBody}\/${flags}"`;
      });
      return JSON.parse(fixed);
    }
  };

  const parsed = parseWithFallback(mockData.trim());
  if (parsed && typeof parsed === 'object') {
    processObject(parsed);
  }
  return parsed;
};

// 配置中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let apiRouter = express.Router();
app.use('/', apiRouter);

// 模拟API数据（实际项目中可以从文件或数据库读取）
let apiConfigs = [];

// 存储注册的路由信息
let registeredRoutes = [];

// 动态注册路由
const registerRoutes = () => {
  
  // 重置路由
  apiRouter.stack.length = 0;
  apiRouter = express.Router();
  app.use('/', apiRouter);

  // 清空注册记录
  registeredRoutes = [];

  // 注册每个API配置
  apiConfigs.forEach(config => {
    try {
      const { url: routePath, method, mockData, delay = 0, statusCode = 200 } = config;
      
      // 检查方法是否支持
      const methodLower = method.toLowerCase();
      if (!apiRouter[methodLower]) {
        console.warn(`不支持的HTTP方法: ${method}`);
        return;
      }
      
      // 注册路由
      apiRouter[methodLower](routePath, (req, res) => {
        // 模拟响应延迟
        setTimeout(() => {
          try {
            // 生成Mock数据
            const data = Mock.mock(parseMockData(mockData));
            res.status(statusCode).json(data);
          } catch (error) {
            console.error('Mock数据生成错误:', error);
            res.status(500).json({
              success: false,
              message: 'Mock数据格式错误',
              error: error.message
            });
          }
        }, delay);
      });
      
      
      // 记录注册的路由
      registeredRoutes.push({ url: routePath, method });
      console.log(`已注册路由: ${method} ${routePath} -> 延迟: ${delay}ms, 状态码: ${statusCode}`);
    } catch (error) {
      console.error('注册路由失败:', error, '配置:', config);
    }
  });
  
  console.log(`总共注册 ${registeredRoutes.length} 个Mock接口`);
};

// 提供API配置管理接口
app.get('/admin/configs', (req, res) => {
  res.json(apiConfigs);
});

app.post('/admin/configs', (req, res) => {
  apiConfigs = req.body;
  registerRoutes();
  res.json({ success: true, message: '配置更新成功' });
});

app.post('/admin/configs/add', (req, res) => {
  const newConfig = req.body;
  apiConfigs.push(newConfig);
  registerRoutes();
  res.json({ success: true, message: '接口添加成功' });
});

app.delete('/admin/configs/:id', (req, res) => {
  const id = parseInt(req.params.id);
  apiConfigs = apiConfigs.filter(config => config.id !== id);
  registerRoutes();
  res.json({ success: true, message: '接口删除成功' });
});

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mock服务器运行正常' });
});

// 启动服务器
app.listen(port, () => {
  console.log(`Mock服务器运行在 http://localhost:${port}`);
  console.log(`健康检查: http://localhost:${port}/health`);
  console.log(`配置管理: http://localhost:${port}/admin/configs`);
});

module.exports = app;
