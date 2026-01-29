const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Mock = require('mockjs');

const app = express();
const port = 3000;

// 配置中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 模拟API数据（实际项目中可以从文件或数据库读取）
let apiConfigs = [];

// 动态注册路由
const registerRoutes = () => {
  // 清除现有路由
  app._router.stack = app._router.stack.filter(layer => {
    return !layer.route || !layer.route.path.startsWith('/api') && !layer.route.path.startsWith('/admin');
  });

  // 注册新路由
  apiConfigs.forEach(config => {
    const { url, method, mockData, delay = 0, statusCode = 200 } = config;
    
    // 处理路径参数，如 /user/:id
    const routePath = url.replace(/:\w+/g, (match) => {
      return match; // 保留原始参数名，如 :id
    });
    
    // 检查方法是否支持
    const methodLower = method.toLowerCase();
    if (!app[methodLower]) {
      console.warn(`不支持的HTTP方法: ${method}`);
      return;
    }
    
    app[methodLower](routePath, (req, res) => {
      // 模拟响应延迟
      setTimeout(() => {
        try {
          // 生成Mock数据
          const data = Mock.mock(JSON.parse(mockData));
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
  });
  
  console.log(`已注册 ${apiConfigs.length} 个Mock接口`);
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