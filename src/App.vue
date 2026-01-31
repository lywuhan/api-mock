<template>
  <el-container class="app-container">
    <el-header height="60px" class="header">
      <h1>API Mock 数据平台</h1>
      <div class="header-actions">
        <el-button type="primary" @click="exportConfig">
          <el-icon>
            <Download />
          </el-icon>
          导出配置
        </el-button>
        <el-button type="success" @click="importConfig">
          <el-icon>
            <Upload />
          </el-icon>
          导入配置
        </el-button>
      </div>
    </el-header>
    <el-container>
      <!-- 左侧目录树 -->
      <el-aside width="260px" class="aside">
        <div class="aside-header">
          <h3>模块目录</h3>
          <el-button type="primary" size="small" @click="addModule">
            <el-icon>
              <Plus />
            </el-icon>
            添加模块
          </el-button>
        </div>
        <!-- 目录树组件 -->
        <div class="tree-container">
          <el-tree
            :data="modules"
            :props="defaultProps"
            node-key="id"
            @node-click="handleNodeClick"
            ref="treeRef"
          >
            <template #default="{ node, data }">
              <div class="custom-tree-node" :class="{ active: node.isCurrent }">
                <span class="tree-node-label">{{ data.label }}</span>
                <span class="custom-node-btn">
                  <el-icon class="icon" @click="editModule(data)">
                    <Edit />
                  </el-icon>
                  <el-icon class="icon">
                    <Delete />
                  </el-icon>
                </span>
              </div>
            </template>
          </el-tree>
        </div>
      </el-aside>
      <!-- 右侧接口管理 -->
      <el-main class="main">
        <!-- 顶部操作栏 -->
        <div class="main-header">
          <h3>{{ currentModuleName || "未选择模块" }}</h3>
          <el-button
            type="primary"
            @click="addApi"
            :disabled="!currentModuleId"
          >
            <el-icon>
              <Plus />
            </el-icon>
            添加接口
          </el-button>
        </div>
        <!-- 搜索筛选 -->
        <div class="api-search">
          <el-input
            v-model="searchQuery"
            placeholder="搜索接口名称或URL"
            prefix-icon="Search"
            clearable
          />
        </div>
        <!-- 接口列表表格 -->
        <div class="api-container">
          <el-table :data="filteredApis" style="width: 100%" border>
            <el-table-column prop="name" label="接口名称" width="200" />
            <el-table-column prop="url" label="URL路径" />
            <el-table-column prop="method" label="请求方法" width="120">
              <template #default="{ row }">
                <el-tag :type="getMethodType(row.method)">{{
                  row.method
                }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="180" />
            <el-table-column label="操作" width="300" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" size="small" @click="editApi(row)"
                  >编辑</el-button
                >
                <el-button type="danger" size="small" @click="deleteApi(row.id)"
                  >删除</el-button
                >
                <el-button type="success" size="small" @click="testApi(row)"
                  >测试</el-button
                >
                <el-button size="small" @click="copyUrl(row.url)"
                  >复制URL</el-button
                >
              </template>
            </el-table-column>
          </el-table>
          <!-- 空状态 -->
          <div v-if="filteredApis.length === 0" class="empty-state">
            <el-empty description="暂无接口" />
          </div>
        </div>
      </el-main>
    </el-container>

    <!-- 模块添加/编辑弹窗 -->
    <el-dialog
      v-model="moduleDialogVisible"
      :title="moduleDialogTitle"
      destroy-on-close
    >
      <el-form :model="moduleForm" label-width="80px">
        <el-form-item label="模块名称" required>
          <el-input v-model="moduleForm.label" placeholder="请输入模块名称" />
        </el-form-item>
        <el-form-item label="所属模块">
          <el-tree
            style="width: 100%"
            :data="filterModules"
            :props="defaultProps"
            node-key="id"
            :current-node-key="currentParentNode?.id"
            default-expand-all
            @node-click="handleSelectParentModule"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="moduleDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveModule">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- API添加/编辑弹窗 -->
    <ApiDialog
      v-model:visible="apiDialogVisible"
      :title="apiDialogTitle"
      :api="editingApi"
      :modules="modules"
      :current-module-id="currentModuleId"
      @save="handleApiSave"
    />

    <!-- 接口测试弹窗 -->
    <el-dialog
      v-model="testDialogVisible"
      :title="'接口测试 - ' + testApiUrl"
      width="800px"
    >
      <el-form :model="testForm" label-width="100px">
        <el-form-item label="请求URL">
          <el-input v-model="testForm.url" />
        </el-form-item>
        <el-form-item label="请求方法">
          <el-select v-model="testForm.method" disabled>
            <el-option label="GET" value="GET" />
            <el-option label="POST" value="POST" />
            <el-option label="PUT" value="PUT" />
            <el-option label="DELETE" value="DELETE" />
          </el-select>
        </el-form-item>
        <el-form-item label="请求参数">
          <el-input
            v-model="testForm.params"
            type="textarea"
            :rows="4"
            placeholder="请输入JSON格式的请求参数"
          />
        </el-form-item>
        <el-form-item label="测试结果">
          <div class="test-result">
            <div v-if="testLoading" class="loading">测试中...</div>
            <div v-else-if="testResult" class="result-content">
              <div class="result-header">
                <span
                  class="status-code"
                  :class="{ success: testResult.status === 200 }"
                  >{{ testResult.status }}</span
                >
                <span class="response-time">{{ testResult.time }}ms</span>
              </div>
              <pre class="result-body">{{
                JSON.stringify(testResult.data, null, 2)
              }}</pre>
            </div>
            <div v-else class="result-empty">请点击测试按钮发送请求</div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="testDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="executeTest">测试</el-button>
        </span>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup>
import {
  ref,
  reactive,
  computed,
  watch,
  onMounted, toRaw
} from "vue";
import { Plus, Download, Upload, Delete, Edit } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import {
  apiConfigService,
  apiTestService,
  healthCheckService,
} from "./services/apiService";
import dbService from "./services/dbService";
import ApiDialog from "./components/ApiDialog.vue";
import { filterTreeNodes } from "./utils";
import { findParent } from "./utils/tree";

// 模块数据
const modules = ref([
  {
    id: 1,
    label: "默认模块",
    children: [],
  },
]);

// 过滤当前选中的模块
const filterModules = computed(() => {
  return filterTreeNodes(
    modules.value,
    (node) => node.id !== currentModuleId.value,
  );
});

const defaultProps = {
  children: "children",
  label: "label",
};

const currentModuleId = ref("");
const currentModuleName = ref("");
const treeRef = ref(null);

const targetNode = ref(null);

// 模块弹窗
const moduleDialogVisible = ref(false);
const moduleDialogTitle = ref("添加模块");
const moduleForm = reactive({ label: "" });
const editingModuleId = ref(null);

const selectedNode = ref(null);

const currentParentNode = computed(() => {
  return findParent(modules.value, currentModuleId.value);
});
// 处理节点点击
const handleNodeClick = (data, node) => {
  selectedNode.value = node;
  currentModuleId.value = data.id;
  currentModuleName.value = data.label;
};

const handleSelectParentModule = (data) => {
  targetNode.value = data;
};

// 添加模块
const addModule = () => {
  moduleDialogTitle.value = "添加模块";
  moduleForm.label = "";
  editingModuleId.value = null;
  moduleDialogVisible.value = true;
};

// 编辑模块
const editModule = (data) => {
  if (data) {
    // const data = selectedNode.value.data;
    moduleDialogTitle.value = "编辑模块";
    moduleForm.label = data.label;
    editingModuleId.value = data.id;

    moduleDialogVisible.value = true;
  }
};

// 删除模块

// 保存模块
const saveModule = () => {
  if (!moduleForm.label.trim()) return;

  if (editingModuleId.value) {
    // 编辑现有模块
    const updateNode = (nodes, id, label) => {
      for (let node of nodes) {
        if (node.id === id) {
          node.label = label;
          return true;
        }
        if (node.children && node.children.length > 0) {
          if (updateNode(node.children, id, label)) {
            return true;
          }
        }
      }
      return false;
    };
    updateNode(modules.value, editingModuleId.value, moduleForm.label);
    if (targetNode.value) {
      treeRef.value.append(selectedNode.value.data, targetNode.value);
    } else {
      modules.value.push(selectedNode.value.data);
    }
    treeRef.value.remove(selectedNode.value);
  } else {
    // 添加新模块
    const newModule = {
      id: Date.now(),
      label: moduleForm.label,
      children: [],
    };
    if (targetNode.value) {
      treeRef.value.append(newModule, targetNode.value);
    } else {
      modules.value.push(newModule);
    }
  }
  saveModuleConfigToDB();
  moduleDialogVisible.value = false;
};

watch(moduleDialogVisible, (newVal) => {
  if (!newVal) {
    targetNode.value = null;
    moduleForm.label = "";
  }
});

// API数据
const apis = ref([
  {
    id: 1,
    name: "获取用户列表",
    url: "/api/users",
    method: "GET",
    moduleId: 1,
    mockData: JSON.stringify({
      success: true,
      code: 200,
      message: "操作成功",
      "data|5-10": [
        {
          "id|+1": 1,
          name: "@cname",
          email: "@email",
          date: "@datetime",
        },
      ],
    }),
    createdAt: "2026-01-29 16:00:00",
  },
  {
    id: 2,
    name: "获取用户详情",
    url: "/api/users/:id",
    method: "GET",
    moduleId: 1,
    mockData: JSON.stringify({
      success: true,
      code: 200,
      message: "操作成功",
      data: {
        id: "@id",
        name: "@cname",
        email: "@email",
        age: "@integer(18, 60)",
        birthday: "@date",
        address: "@city",
      },
    }),
    createdAt: "2026-01-29 16:01:00",
  },
]);

// 搜索查询
const searchQuery = ref("");

// 筛选后的API列表
const filteredApis = computed(() => {
  if (!currentModuleId.value) return [];
  if (!searchQuery.value) {
    return apis.value.filter((api) => api.moduleId === currentModuleId.value);
  }
  const query = searchQuery.value.toLowerCase();
  return apis.value.filter((api) => {
    return (
      api.moduleId === currentModuleId.value &&
      (api.name.toLowerCase().includes(query) ||
        api.url.toLowerCase().includes(query))
    );
  });
});

// 获取方法类型样式
const getMethodType = (method) => {
  const methodMap = {
    GET: "success",
    POST: "primary",
    PUT: "warning",
    DELETE: "danger",
  };
  return methodMap[method] || "info";
};

// 删除接口
const deleteApi = (id) => {
  const index = apis.value.findIndex((api) => api.id === id);
  if (index > -1) {
    apis.value.splice(index, 1);
  }
  saveApiConfigToDB()
};

// 测试接口相关
const testDialogVisible = ref(false);
const testApiUrl = ref("");
const testForm = reactive({
  url: "",
  method: "GET",
  params: "{}",
});
const testLoading = ref(false);
const testResult = ref(null);

// 打开测试弹窗
const testApi = (row) => {
  testApiUrl.value = row.url;
  testForm.url = row.url;
  testForm.method = row.method;
  testForm.params = "{}";
  testResult.value = null;
  testDialogVisible.value = true;
};

// 执行测试
const executeTest = async () => {
  testLoading.value = true;
  testResult.value = null;

  try {
    const startTime = Date.now();
    const params = JSON.parse(testForm.params || "{}");
    const response = await apiTestService.testApi(
      testForm.url,
      testForm.method,
      params,
    );
    const endTime = Date.now();

    testResult.value = {
      status: 200,
      time: endTime - startTime,
      data: response,
    };
  } catch (error) {
    testResult.value = {
      status: error.response?.status || 500,
      time: 0,
      data: {
        success: false,
        message: error.message,
        error: error.response?.data || {},
      },
    };
  } finally {
    testLoading.value = false;
  }
};

// 健康检查
const checkHealth = async () => {
  try {
    const response = await healthCheckService.check();
    console.log("后端服务状态:", response);
  } catch (error) {
    console.warn("后端服务可能未启动:", error.message);
  }
};

// 保存配置到数据库
const saveApiConfigToDB = async () => {
  try {
    await dbService.saveApis(toRaw(apis.value));
    // 同步到后端
    await apiConfigService.updateConfigs(toRaw(apis.value));
  } catch (error) {
    console.error("保存配置失败:", error);
  }
};

const saveModuleConfigToDB = async () => {
  try {
    await dbService.saveModules(toRaw(modules.value));
  } catch (error) {
    console.error("保存配置失败:", error);
  }
};

// 从数据库加载配置
const loadConfigFromDB = async () => {
  try {
    const savedModules = await dbService.getModules();
    const savedApis = await dbService.getApis();
    let hasConfig = false;

    if (savedModules.length > 0) {
      modules.value = savedModules;
      hasConfig = true;
    } else {
      // 使用默认模块
      await dbService.saveModules(toRaw(modules.value));
    }

    if (savedApis.length > 0) {
      apis.value = savedApis;
      hasConfig = true;
    } else {
      // 使用默认API配置
      await dbService.saveApis(toRaw(apis.value));
    }

    // 同步到后端
    await apiConfigService.updateConfigs(apis.value);

    if (!hasConfig) {
      ElMessage.info("使用默认API配置");
    }
  } catch (error) {
    console.error("加载配置失败:", error);
    // 出错时也同步默认配置到后端
    try {
      await apiConfigService.updateConfigs(apis.value);
      ElMessage.success("已同步默认API配置到后端");
    } catch (syncError) {
      console.error("同步配置失败:", syncError);
    }
  }
};

// 导出配置
const exportConfig = async () => {
  try {
    const config = await dbService.exportConfig();
    const configStr = JSON.stringify(config, null, 2);
    const blob = new Blob([configStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `api-mock-config-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    ElMessage.success("配置导出成功");
  } catch (error) {
    console.error("导出配置失败:", error);
    ElMessage.error("导出配置失败");
  }
};

// 导入配置
const importConfig = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const config = JSON.parse(event.target.result);
            await dbService.importConfig(config);
            await loadConfigFromDB();
            ElMessage.success("配置导入成功");
          } catch (error) {
            console.error("解析配置文件失败:", error);
            ElMessage.error("解析配置文件失败");
          }
        };
        reader.readAsText(file);
      } catch (error) {
        console.error("导入配置失败:", error);
        ElMessage.error("导入配置失败");
      }
    }
  };
  input.click();
};

// 组件挂载时加载数据
onMounted(async () => {
  await loadConfigFromDB();
  await checkHealth();
});

// 复制URL
const copyUrl = (url) => {
  navigator.clipboard.writeText(url).then(() => {
    ElMessage.success("URL复制成功");
  });
};

// API弹窗
const apiDialogVisible = ref(false);
const apiDialogTitle = ref("添加接口");
const editingApi = ref({});

// 添加接口
const addApi = () => {
  apiDialogTitle.value = "添加接口";
  editingApi.value = {
    name: "",
    url: "",
    method: "GET",
    moduleId: currentModuleId.value,
    mockData: "",
    delay: 0,
    statusCode: 200,
  };
  apiDialogVisible.value = true;
};

// 编辑接口
const editApi = (row) => {
  apiDialogTitle.value = "编辑接口";
  editingApi.value = { ...row };
  apiDialogVisible.value = true;
};

// 处理接口保存
const handleApiSave = async (apiData) => {
  const now = new Date().toLocaleString();
  if (editingApi.value.id) {
    // 编辑现有接口
    const index = apis.value.findIndex((api) => api.id === editingApi.value.id);
    if (index > -1) {
      apis.value[index] = {
        ...apis.value[index],
        ...apiData,
      };
    }
  } else {
    // 添加新接口
    const newApi = {
      id: Date.now(),
      ...apiData,
      createdAt: now,
    };
    apis.value.push(newApi);
  }

  apiDialogVisible.value = false;

  // 保存配置到数据库并同步到后端
  try {
    await saveApiConfigToDB();
    ElMessage.success("接口保存成功并同步到后端");
  } catch (error) {
    console.error("同步配置失败:", error);
    ElMessage.success("接口保存成功，但同步到后端失败");
  }
};
</script>

<style lang="css">
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.el-tree-node.is-current > .el-tree-node__content {
  background-color: var(--el-tree-node-hover-bg-color);
}
</style>
<style scoped lang="scss">
.app-container {
  height: 100vh;
  overflow: hidden;
}

.header {
  background-color: #409eff;
  color: white;
  display: flex;
  align-items: center;
  padding: 0 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h1 {
  margin: 0;
  font-size: 20px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.aside {
  background-color: #fff;
  border-right: 1px solid #e4e7ed;
  overflow-y: auto;
}

.aside-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #e4e7ed;
}

.aside-header h3 {
  margin: 0;
  font-size: 16px;
}

.tree-container {
  padding: 15px;
}

.main {
  background-color: #fff;
  overflow-y: auto;
}

.main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0 20px 0;
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 20px;
}

.main-header h3 {
  margin: 0;
  font-size: 18px;
}

.api-search {
  margin-bottom: 20px;
}

.api-container {
  padding: 0 20px 20px 0;
}

.empty-state {
  padding: 40px 0;
  text-align: center;
}

.custom-tree-node {
  width: 100%;
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  &:hover {
    .custom-node-btn {
      visibility: visible;
    }
  }
}

.custom-tree-node.active {
  .tree-node-label {
    color: #409eff;
  }
}

.custom-node-btn {
  visibility: hidden;
  display: grid;
  gap: 10px;
  align-items: center;
  grid-auto-flow: column;
  padding-right: 5px;

  & .icon:hover {
    opacity: 0.7;
  }
}

.tree-node-label {
  cursor: pointer;
}

.context-menu {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mock-tips {
  margin-top: 10px;
  display: flex;
  gap: 10px;
}

.preview-container {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 10px;
  background-color: #f5f7fa;
  max-height: 300px;
  overflow-y: auto;
}

.preview-container pre {
  margin: 0;
  font-family: "Courier New", Courier, monospace;
  font-size: 14px;
}

.preview-empty {
  color: #909399;
  text-align: center;
  padding: 20px;
}

.test-result {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 10px;
  min-height: 200px;
}

.test-result .loading {
  text-align: center;
  padding: 40px;
  color: #909399;
}

.test-result .result-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.test-result .result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 10px;
  border-bottom: 1px solid #e4e7ed;
}

.test-result .status-code {
  font-size: 16px;
  font-weight: bold;
  padding: 2px 10px;
  border-radius: 4px;
  background-color: #f56c6c;
  color: white;
}

.test-result .status-code.success {
  background-color: #67c23a;
}

.test-result .response-time {
  font-size: 14px;
  color: #909399;
}

.test-result .result-body {
  margin: 0;
  font-family: "Courier New", Courier, monospace;
  font-size: 14px;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 300px;
  overflow-y: auto;
}

.test-result .result-empty {
  text-align: center;
  padding: 40px;
  color: #909399;
}

/* 表单树样式 */
.form-tree-container {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 15px;
  background-color: #f5f7fa;
  min-height: 300px;
}

.form-tree-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e4e7ed;
}

.form-tree {
  margin-bottom: 20px;
}

.form-tree .el-tree {
  background-color: transparent;
}

.tree-node-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.field-name {
  font-weight: bold;
  margin-right: 10px;
}

.field-type {
  color: #909399;
  font-size: 12px;
  margin-right: 20px;
}

.node-actions {
  display: flex;
  gap: 5px;
}

.form-tree-empty {
  padding: 40px;
  text-align: center;
}

.mock-rule-tips {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
</style>
