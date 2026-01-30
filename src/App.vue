<template>
  <el-container class="app-container">
    <el-header height="60px" class="header">
      <h1>API Mock 数据平台</h1>
      <div class="header-actions">
        <el-button type="primary" @click="exportConfig">
          <el-icon><Download /></el-icon> 导出配置
        </el-button>
        <el-button type="success" @click="importConfig">
          <el-icon><Upload /></el-icon> 导入配置
        </el-button>
      </div>
    </el-header>
    <el-container>
      <!-- 左侧目录树 -->
      <el-aside width="260px" class="aside">
        <div class="aside-header">
          <h3>模块目录</h3>
          <el-button type="primary" size="small" @click="addModule">
            <el-icon><Plus /></el-icon> 添加模块
          </el-button>
        </div>
        <!-- 目录树组件 -->
        <div class="tree-container">
          <el-tree
            :data="modules"
            :props="defaultProps"
            node-key="id"
            @node-click="handleNodeClick"
            @node-contextmenu="handleNodeContextMenu"
            ref="treeRef"
          >
            <template #default="{ node, data }">
              <div class="custom-tree-node" :class="{ active: node.isCurrent }">
                <span class="tree-node-label">{{ data.label }}</span>
                <span class="custom-node-btn">
                  <el-icon class="icon"><Plus /></el-icon>
                  <el-icon class="icon"><Delete /></el-icon>
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
            <el-icon><Plus /></el-icon> 添加接口
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
    <el-dialog v-model="moduleDialogVisible" :title="moduleDialogTitle" destroy-on-close>
      <el-form :model="moduleForm" label-width="80px">
        <el-form-item label="模块名称" required>
          <el-input v-model="moduleForm.label" placeholder="请输入模块名称" />
        </el-form-item>
        <el-form-item label="父模块">
            <el-tree
              style="width: 100%"
              :data="modules"
              :props="defaultProps"
              default-expand-all
              @node-click="handleNodeSelect"
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

    <!-- 右键菜单 -->
    <el-popover
      v-model:visible="contextMenuVisible"
      :width="120"
      trigger="manual"
      :position="'bottom'"
      :reference="contextMenuRef"
    >
      <template #reference>
        <div ref="contextMenuRef"></div>
      </template>
      <div class="context-menu">
        <el-button type="text" size="small" @click="editModule">编辑</el-button>
        <el-button type="text" size="small" @click="deleteModule"
          >删除</el-button
        >
      </div>
    </el-popover>

    <!-- API添加/编辑弹窗 -->
    <el-dialog v-model="apiDialogVisible" :title="apiDialogTitle" width="800px">
      <el-form
        :model="apiForm"
        label-width="100px"
        :rules="apiFormRules"
        ref="apiFormRef"
      >
        <!-- 基础信息 -->
        <el-form-item label="接口名称" prop="name">
          <el-input v-model="apiForm.name" placeholder="请输入接口名称" />
        </el-form-item>
        <el-form-item label="URL路径" prop="url">
          <el-input
            v-model="apiForm.url"
            placeholder="请输入URL路径，以/开头"
          />
        </el-form-item>
        <el-form-item label="请求方法" prop="method">
          <el-select v-model="apiForm.method" placeholder="请选择请求方法">
            <el-option label="GET" value="GET" />
            <el-option label="POST" value="POST" />
            <el-option label="PUT" value="PUT" />
            <el-option label="DELETE" value="DELETE" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属模块" prop="moduleId">
          <el-select v-model="apiForm.moduleId" placeholder="请选择所属模块">
            <el-option
              v-for="module in modules"
              :key="module.id"
              :label="module.label"
              :value="module.id"
            />
          </el-select>
        </el-form-item>

        <!-- Mock数据配置 -->
        <el-form-item label="Mock数据">
          <div class="form-tree-container">
            <!-- 表单树操作栏 -->
            <div class="form-tree-actions">
              <el-button type="primary" size="small" @click="addRootField">
                <el-icon><Plus /></el-icon> 添加字段
              </el-button>
              <el-button type="success" size="small" @click="clearFormTree">
                <el-icon><Delete /></el-icon> 清空
              </el-button>
            </div>

            <!-- 表单树 -->
            <div class="form-tree">
              <el-tree
                :data="formTreeData"
                node-key="id"
                :props="treeProps"
                default-expand-all
              >
                <template #default="{ node, data }">
                  <div class="tree-node-content">
                    <span class="field-name">{{ data.name }}</span>
                    <span class="field-type">({{ data.type }})</span>
                    <div class="node-actions">
                      <el-button
                        type="text"
                        size="small"
                        @click="editField(data)"
                      >
                        <el-icon><Edit /></el-icon> 编辑
                      </el-button>
                      <el-button
                        type="text"
                        size="small"
                        @click="addChildField(data.id)"
                      >
                        <el-icon><Plus /></el-icon> 添加子字段
                      </el-button>
                      <el-button
                        type="text"
                        size="small"
                        @click="deleteField(data.id)"
                      >
                        <el-icon><Delete /></el-icon> 删除
                      </el-button>
                    </div>
                  </div>
                </template>
              </el-tree>
            </div>

            <!-- 空状态 -->
            <div v-if="formTreeData.length === 0" class="form-tree-empty">
              <el-empty description="请添加字段配置" />
            </div>
          </div>
        </el-form-item>

        <!-- 实时预览 -->
        <el-form-item label="预览数据">
          <div class="preview-container">
            <pre v-if="previewData">{{
              JSON.stringify(previewData, null, 2)
            }}</pre>
            <div v-else class="preview-empty">请输入Mock数据模板查看预览</div>
          </div>
        </el-form-item>

        <!-- 响应设置 -->
        <el-form-item label="响应延迟">
          <el-input-number
            v-model="apiForm.delay"
            :min="0"
            :max="5000"
            placeholder="请输入延迟时间（ms）"
          />
        </el-form-item>
        <el-form-item label="HTTP状态码">
          <el-input-number
            v-model="apiForm.statusCode"
            :min="100"
            :max="599"
            placeholder="请输入状态码"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="apiDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveApi">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 接口测试弹窗 -->
    <el-dialog
      v-model="testDialogVisible"
      :title="'接口测试 - ' + testApiUrl"
      width="800px"
    >
      <el-form :model="testForm" label-width="100px">
        <el-form-item label="请求URL">
          <el-input v-model="testForm.url" disabled />
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

    <!-- 字段编辑弹窗 -->
    <el-dialog
      v-model="fieldDialogVisible"
      :title="fieldDialogTitle"
      width="600px"
    >
      <el-form :model="fieldForm" label-width="100px">
        <el-form-item label="字段名称" required>
          <el-input v-model="fieldForm.name" placeholder="请输入字段名称" />
        </el-form-item>
        <el-form-item label="字段类型" required>
          <el-select v-model="fieldForm.type" placeholder="请选择字段类型">
            <el-option
              v-for="type in fieldTypes"
              :key="type.value"
              :label="type.label"
              :value="type.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="默认值">
          <el-input v-model="fieldForm.value" placeholder="请输入默认值" />
        </el-form-item>
        <el-form-item label="Mock规则">
          <el-input
            v-model="fieldForm.mockRule"
            placeholder="请输入Mock.js规则，如 @name、@integer(1, 100)"
          />
          <div class="mock-rule-tips">
            <el-button type="text" size="small" @click="insertMockRule('@name')"
              >姓名</el-button
            >
            <el-button
              type="text"
              size="small"
              @click="insertMockRule('@cname')"
              >中文姓名</el-button
            >
            <el-button
              type="text"
              size="small"
              @click="insertMockRule('@integer(1, 100)')"
              >数字</el-button
            >
            <el-button type="text" size="small" @click="insertMockRule('@date')"
              >日期</el-button
            >
            <el-button
              type="text"
              size="small"
              @click="insertMockRule('@email')"
              >邮箱</el-button
            >
            <el-button type="text" size="small" @click="insertMockRule('@id')"
              >ID</el-button
            >
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="fieldDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveField">保存</el-button>
        </span>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, unref, toValue, toRaw } from "vue";
import { Plus, Download, Upload, Delete } from "@element-plus/icons-vue";
import { ElMessage, ElLoading, ElMessageBox } from "element-plus";
import Mock from "mockjs";
import {
  apiConfigService,
  apiTestService,
  healthCheckService,
} from "./services/apiService";
import dbService from "./services/dbService";

// 模块数据
const modules = ref([
  {
    id: 1,
    label: "默认模块",
    children: [],
  },
]);

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

// 右键菜单
const contextMenuVisible = ref(false);
const contextMenuRef = ref(null);
const selectedNode = ref(null);

// 处理节点点击
const handleNodeClick = (data, node) => {
  currentModuleId.value = data.id;
  currentModuleName.value = data.label;
};

const handleNodeSelect = (data) => {
  targetNode.value = data;
};

// 处理右键菜单
const handleNodeContextMenu = (event, node) => {
  event.preventDefault();
  selectedNode.value = node;
  contextMenuVisible.value = true;
};

// 添加模块
const addModule = () => {
  moduleDialogTitle.value = "添加模块";
  moduleForm.label = "";
  editingModuleId.value = null;
  moduleDialogVisible.value = true;
};

// 编辑模块
const editModule = () => {
  if (selectedNode.value) {
    const data = selectedNode.value.data;
    moduleDialogTitle.value = "编辑模块";
    moduleForm.label = data.label;
    editingModuleId.value = data.id;
    moduleDialogVisible.value = true;
    contextMenuVisible.value = false;
  }
};

// 删除模块
const deleteModule = () => {
  if (selectedNode.value) {
    const data = selectedNode.value.data;
    // 找到并删除模块
    const deleteNode = (nodes, id) => {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === id) {
          nodes.splice(i, 1);
          return true;
        }
        if (nodes[i].children && nodes[i].children.length > 0) {
          if (deleteNode(nodes[i].children, id)) {
            return true;
          }
        }
      }
      return false;
    };
    deleteNode(modules.value, data.id);
    contextMenuVisible.value = false;
  }
};

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

  moduleDialogVisible.value = false;
};

watch(moduleDialogVisible, (newVal) => {
  if (!newVal) {
    targetNode.value = null;
    moduleForm.label = "";
  }
})

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
    const params = JSON.parse(testForm.params);
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
const saveConfigToDB = async () => {
  try {
    await dbService.saveModules(toRaw(modules.value));
    await dbService.saveApis(toRaw(apis.value));
    // 同步到后端
    await apiConfigService.updateConfigs(toRaw(apis.value));
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

// 监听数据变化，自动保存
watch(
  [modules, apis],
  async () => {
    await saveConfigToDB();
  },
  { deep: true },
);

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
const apiFormRef = ref(null);
const apiForm = reactive({
  name: "",
  url: "",
  method: "GET",
  moduleId: "",
  mockData: "",
  delay: 0,
  statusCode: 200,
});
const editingApiId = ref(null);

// API表单验证规则
const apiFormRules = {
  name: [{ required: true, message: "请输入接口名称", trigger: "blur" }],
  url: [
    { required: true, message: "请输入URL路径", trigger: "blur" },
    { pattern: /^\//, message: "URL路径必须以/开头", trigger: "blur" },
  ],
  method: [{ required: true, message: "请选择请求方法", trigger: "change" }],
  moduleId: [{ required: true, message: "请选择所属模块", trigger: "change" }],
};

// 表单树数据
const formTreeData = ref([]);

// 树组件配置
const treeProps = {
  children: "children",
  label: "name",
};

// 字段编辑弹窗
const fieldDialogVisible = ref(false);
const fieldDialogTitle = ref("添加字段");
const fieldForm = reactive({
  id: "",
  name: "",
  type: "string",
  value: "",
  mockRule: "",
  parentId: null,
});

// 支持的字段类型
const fieldTypes = [
  { label: "字符串", value: "string" },
  { label: "数字", value: "number" },
  { label: "布尔值", value: "boolean" },
  { label: "对象", value: "object" },
  { label: "数组", value: "array" },
  { label: "日期", value: "date" },
  { label: "邮箱", value: "email" },
  { label: "ID", value: "id" },
];

// 监听表单树变化，生成Mock数据模板
watch(
  () => formTreeData.value,
  (newVal) => {
    if (newVal.length > 0) {
      const mockTemplate = formTreeToMockTemplate(newVal);
      apiForm.mockData = JSON.stringify(mockTemplate, null, 2);
      try {
        previewData.value = Mock.mock(mockTemplate);
      } catch (error) {
        previewData.value = null;
      }
    } else {
      apiForm.mockData = "";
      previewData.value = null;
    }
  },
  { deep: true },
);

// 表单树转换为Mock模板
const formTreeToMockTemplate = (treeData) => {
  const template = {};

  treeData.forEach((node) => {
    template[node.name] = convertNodeToMock(node);
  });

  return template;
};

// 转换单个节点为Mock格式
const convertNodeToMock = (node) => {
  if (node.type === "object" && node.children && node.children.length > 0) {
    const obj = {};
    node.children.forEach((child) => {
      obj[child.name] = convertNodeToMock(child);
    });
    return obj;
  } else if (
    node.type === "array" &&
    node.children &&
    node.children.length > 0
  ) {
    return [convertNodeToMock(node.children[0])];
  } else if (node.mockRule) {
    return node.mockRule;
  } else {
    switch (node.type) {
      case "string":
        return node.value || "@string";
      case "number":
        return node.value ? Number(node.value) : "@integer";
      case "boolean":
        return node.value === "true";
      case "date":
        return "@date";
      case "email":
        return "@email";
      case "id":
        return "@id";
      default:
        return node.value || "";
    }
  }
};

// 添加根字段
const addRootField = () => {
  fieldDialogTitle.value = "添加字段";
  Object.assign(fieldForm, {
    id: Date.now(),
    name: "",
    type: "string",
    value: "",
    mockRule: "",
    parentId: null,
  });
  fieldDialogVisible.value = true;
};

// 添加子字段
const addChildField = (parentId) => {
  fieldDialogTitle.value = "添加子字段";
  Object.assign(fieldForm, {
    id: Date.now(),
    name: "",
    type: "string",
    value: "",
    mockRule: "",
    parentId,
  });
  fieldDialogVisible.value = true;
};

// 编辑字段
const editField = (data) => {
  fieldDialogTitle.value = "编辑字段";
  Object.assign(fieldForm, {
    id: data.id,
    name: data.name,
    type: data.type,
    value: data.value || "",
    mockRule: data.mockRule || "",
    parentId: data.parentId,
  });
  fieldDialogVisible.value = true;
};

// 保存字段
const saveField = () => {
  if (!fieldForm.name) {
    ElMessage.error("字段名称不能为空");
    return;
  }

  if (fieldForm.parentId) {
    // 添加/编辑子字段
    const parentNode = findNodeById(formTreeData.value, fieldForm.parentId);
    if (parentNode) {
      if (!parentNode.children) {
        parentNode.children = [];
      }

      const existingIndex = parentNode.children.findIndex(
        (node) => node.id === fieldForm.id,
      );
      if (existingIndex > -1) {
        parentNode.children[existingIndex] = {
          id: fieldForm.id,
          name: fieldForm.name,
          type: fieldForm.type,
          value: fieldForm.value,
          mockRule: fieldForm.mockRule,
          parentId: fieldForm.parentId,
          children: parentNode.children[existingIndex].children,
        };
      } else {
        parentNode.children.push({
          id: fieldForm.id,
          name: fieldForm.name,
          type: fieldForm.type,
          value: fieldForm.value,
          mockRule: fieldForm.mockRule,
          parentId: fieldForm.parentId,
          children: [],
        });
      }
    }
  } else {
    // 添加/编辑根字段
    const existingIndex = formTreeData.value.findIndex(
      (node) => node.id === fieldForm.id,
    );
    if (existingIndex > -1) {
      formTreeData.value[existingIndex] = {
        id: fieldForm.id,
        name: fieldForm.name,
        type: fieldForm.type,
        value: fieldForm.value,
        mockRule: fieldForm.mockRule,
        parentId: null,
        children: formTreeData.value[existingIndex].children,
      };
    } else {
      formTreeData.value.push({
        id: fieldForm.id,
        name: fieldForm.name,
        type: fieldForm.type,
        value: fieldForm.value,
        mockRule: fieldForm.mockRule,
        parentId: null,
        children: [],
      });
    }
  }

  fieldDialogVisible.value = false;
  ElMessage.success("字段保存成功");
};

// 根据ID查找节点
const findNodeById = (nodes, id) => {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) {
        return found;
      }
    }
  }
  return null;
};

// 删除字段
const deleteField = (id) => {
  // 从根节点删除
  const rootIndex = formTreeData.value.findIndex((node) => node.id === id);
  if (rootIndex > -1) {
    formTreeData.value.splice(rootIndex, 1);
    ElMessage.success("字段删除成功");
    return;
  }

  // 从子节点删除
  deleteChildNode(formTreeData.value, id);
};

// 删除子节点
const deleteChildNode = (nodes, id) => {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.children) {
      const childIndex = node.children.findIndex((child) => child.id === id);
      if (childIndex > -1) {
        node.children.splice(childIndex, 1);
        ElMessage.success("字段删除成功");
        return true;
      }
      if (deleteChildNode(node.children, id)) {
        return true;
      }
    }
  }
  return false;
};

// 清空表单树
const clearFormTree = () => {
  ElMessageBox.confirm("确定要清空所有字段配置吗？", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    formTreeData.value = [];
    ElMessage.success("已清空字段配置");
  });
};

// 插入Mock规则
const insertMockRule = (rule) => {
  fieldForm.mockRule = rule;
};

// 预览数据
const previewData = ref(null);

// Mock模板
const mockTemplates = {
  user: `{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": "@id",
    "name": "@cname",
    "email": "@email",
    "age": "@integer(18, 60)",
    "birthday": "@date",
    "address": "@city"
  }
}`,
  list: `{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "data|5-10": [{
    "id|+1": 1,
    "name": "@cname",
    "email": "@email",
    "date": "@datetime"
  }]
}`,
  success: `{
  "success": true,
  "code": 200,
  "message": "操作成功"
}`,
};

// 插入Mock模板
const insertMockTemplate = (type) => {
  apiForm.mockData = mockTemplates[type];
};

// 添加接口
const addApi = () => {
  apiDialogTitle.value = "添加接口";
  Object.assign(apiForm, {
    name: "",
    url: "",
    method: "GET",
    moduleId: currentModuleId.value,
    mockData: "",
    delay: 0,
    statusCode: 200,
  });
  // 清空表单树数据
  formTreeData.value = [];
  editingApiId.value = null;
  apiDialogVisible.value = true;
};

// 编辑接口
const editApi = (row) => {
  apiDialogTitle.value = "编辑接口";
  Object.assign(apiForm, {
    name: row.name,
    url: row.url,
    method: row.method,
    moduleId: row.moduleId,
    mockData: row.mockData || "",
    delay: row.delay || 0,
    statusCode: row.statusCode || 200,
  });

  // 将mockData转换为表单树数据
  if (row.mockData) {
    try {
      const mockData = JSON.parse(row.mockData);
      formTreeData.value = mockDataToFormTree(mockData);
    } catch (error) {
      console.error("解析mockData失败:", error);
      formTreeData.value = [];
    }
  } else {
    formTreeData.value = [];
  }

  editingApiId.value = row.id;
  apiDialogVisible.value = true;
};

// 将Mock数据转换为表单树数据
const mockDataToFormTree = (data, parentId = null) => {
  const treeData = [];

  if (typeof data === "object" && data !== null) {
    Object.entries(data).forEach(([key, value], index) => {
      const node = {
        id: Date.now() + index,
        name: key,
        type: getNodeType(value),
        value: typeof value !== "object" ? String(value) : "",
        mockRule: "",
        parentId,
        children: [],
      };

      if (typeof value === "object" && value !== null) {
        node.children = mockDataToFormTree(value, node.id);
      }

      treeData.push(node);
    });
  }

  return treeData;
};

// 获取节点类型
const getNodeType = (value) => {
  if (Array.isArray(value)) {
    return "array";
  } else if (typeof value === "object" && value !== null) {
    return "object";
  } else if (typeof value === "number") {
    return "number";
  } else if (typeof value === "boolean") {
    return "boolean";
  } else {
    return "string";
  }
};

// 保存接口
const saveApi = async () => {
  await apiFormRef.value.validate();

  const now = new Date().toLocaleString();

  if (editingApiId.value) {
    // 编辑现有接口
    const index = apis.value.findIndex((api) => api.id === editingApiId.value);
    if (index > -1) {
      apis.value[index] = {
        ...apis.value[index],
        ...apiForm,
      };
    }
  } else {
    // 添加新接口
    const newApi = {
      id: Date.now(),
      ...apiForm,
      createdAt: now,
    };
    apis.value.push(newApi);
  }

  apiDialogVisible.value = false;

  // 保存配置到数据库并同步到后端
  try {
    await saveConfigToDB();
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
}
.custom-tree-node.active {
  &:hover {
    .custom-node-btn {
      visibility: visible;
    }
  }
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
