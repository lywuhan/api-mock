<template>
  <!-- API添加/编辑弹窗 -->
  <el-drawer v-model="dialogVisible" :title="dialogTitle" size="60%" direction="rtl">
    <el-form :model="apiForm" label-width="100px" :rules="apiFormRules" ref="apiFormRef">
      <!-- 基础信息 -->
      <el-form-item label="接口名称" prop="name">
        <el-input v-model="apiForm.name" placeholder="请输入接口名称" />
      </el-form-item>
      <el-form-item label="URL路径" prop="url">
        <el-input v-model="apiForm.url" placeholder="请输入URL路径，以/开头" />
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
          <el-option v-for="module in modules" :key="module.id" :label="module.label" :value="module.id" />
        </el-select>
      </el-form-item>

      <!-- Mock数据配置 -->
      <el-form-item label="Mock数据">
        <div class="form-tree-container">
          <!-- 表单树操作栏 -->
          <div class="form-tree-actions">
            <el-button type="primary" size="small" @click="addRootField">
              <el-icon>
                <Plus />
              </el-icon> 添加字段
            </el-button>
            <el-button type="success" size="small" @click="clearFormTree">
              <el-icon>
                <Delete />
              </el-icon> 清空
            </el-button>
          </div>

          <!-- 表单树 -->
          <div class="form-tree">
            <el-tree :data="formTreeData" node-key="id" :props="treeProps" default-expand-all>
              <template #default="{ node, data }">
                <div class="tree-node-content">
                  <span class="field-name">{{ data.name }}</span>
                  <span class="field-type">({{ data.type }})</span>
                  <div class="node-actions">
                    <el-button link type="primary" size="small" @click="editField(data)">
                      <el-icon>
                        <Edit />
                      </el-icon> 编辑
                    </el-button>
                    <el-button link type="primary" size="small" @click="addChildField(data.id)">
                      <el-icon>
                        <Plus />
                      </el-icon> 添加子字段
                    </el-button>
                    <el-button link type="primary" size="small" @click="deleteField(data.id)">
                      <el-icon>
                        <Delete />
                      </el-icon> 删除
                    </el-button>
                  </div>
                </div>
              </template>

              <template #empty>
                <el-empty description="请添加字段配置" />
              </template>
            </el-tree>
          </div>

          <!-- 空状态 -->
          <!-- <div v-if="formTreeData.length === 0" class="form-tree-empty">
            
          </div> -->
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
        <el-input-number v-model="apiForm.delay" :min="0" :max="5000" placeholder="请输入延迟时间（ms）" />
      </el-form-item>
      <el-form-item label="HTTP状态码">
        <el-input-number v-model="apiForm.statusCode" :min="100" :max="599" placeholder="请输入状态码" />
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveApi">保存</el-button>
      </span>
    </template>
  </el-drawer>

  <!-- 字段编辑弹窗 -->
  <el-dialog v-model="fieldDialogVisible" :title="fieldDialogTitle" width="600px">
    <el-form :model="fieldForm" label-width="100px">
      <el-form-item label="字段名称" required>
        <el-input v-model="fieldForm.name" placeholder="请输入字段名称" />
      </el-form-item>
      <el-form-item label="字段类型" required>
        <el-select v-model="fieldForm.type" placeholder="请选择字段类型">
          <el-option v-for="type in fieldTypes" :key="type.value" :label="type.label" :value="type.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="默认值">
        <el-input v-model="fieldForm.value" placeholder="请输入默认值" />
      </el-form-item>
      <el-form-item label="Mock规则">
        <el-input v-model="fieldForm.mockRule" placeholder="请输入Mock.js规则，如 @name、@integer(1, 100)" />
        <div class="mock-rule-tips">
          <el-button link type="primary" size="small" @click="insertMockRule('@name')">姓名</el-button>
          <el-button link type="primary" size="small" @click="insertMockRule('@cname')">中文姓名</el-button>
          <el-button link type="primary" size="small" @click="insertMockRule('@integer(1, 100)')">数字</el-button>
          <el-button link type="primary" size="small" @click="insertMockRule('@date')">日期</el-button>
          <el-button link type="primary" size="small" @click="insertMockRule('@email')">邮箱</el-button>
          <el-button link type="primary" size="small" @click="insertMockRule('@id')">ID</el-button>
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
</template>

<script setup>
import { ref, reactive, computed, watch } from "vue";
import { Plus, Delete, Edit } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import Mock from "mockjs";
import { guid, jsonParse, stringify } from "../utils";

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: "添加接口",
  },
  api: {
    type: Object,
    default: () => ({}),
  },
  modules: {
    type: Array,
    default: () => [],
  },
  currentModuleId: {
    type: [String, Number],
    default: "",
  },
});

// Emits
const emit = defineEmits(["update:visible", "save"]);

// 弹窗状态
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit("update:visible", value),
});

const dialogTitle = computed(() => props.title);

// API表单
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
  { label: "正则", value: "regexp" },
];

// 预览数据
const previewData = ref(null);

// 监听表单树变化，生成Mock数据模板
watch(
  () => formTreeData.value,
  (newVal) => {
    if (newVal.length > 0) {
      const mockTemplate = formTreeToMockTemplate(newVal);
      console.log('mockTemplate', mockTemplate)
      apiForm.mockData = stringify(mockTemplate, null, 2);
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

// 监听props变化，更新表单数据
watch(
  () => [props.api, props.currentModuleId],
  ([newApi, newModuleId]) => {
    if (newApi.id) {
      // 编辑模式
      Object.assign(apiForm, {
        name: newApi.name || "",
        url: newApi.url || "",
        method: newApi.method || "GET",
        moduleId: newApi.moduleId || newModuleId,
        mockData: newApi.mockData || "",
        delay: newApi.delay || 0,
        statusCode: newApi.statusCode || 200,
      });

      // 将mockData转换为表单树数据
      if (newApi.mockData) {
        try {
          console.log('mockdata', newApi.mockData)
          const mockData = jsonParse(newApi.mockData);
          formTreeData.value = mockDataToFormTree(mockData);
        } catch (error) {
          console.error("解析mockData失败:", error);
          formTreeData.value = [];
        }
      } else {
        formTreeData.value = [];
      }
    } else {
      // 添加模式
      Object.assign(apiForm, {
        name: "",
        url: "",
        method: "GET",
        moduleId: newModuleId,
        mockData: "",
        delay: 0,
        statusCode: 200,
      });
      formTreeData.value = [];
    }
  },
  { deep: true, immediate: true },
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
      case "regexp":
        if (!node.value) {
          return new RegExp("");
        }
        if (typeof node.value === "string" && node.value.startsWith("/")) {
          const lastSlashIndex = node.value.lastIndexOf("/");
          if (lastSlashIndex > 0) {
            const pattern = node.value.slice(1, lastSlashIndex);
            const flags = node.value.slice(lastSlashIndex + 1);
            try {
              return new RegExp(pattern, flags);
            } catch (error) {
              return new RegExp(pattern);
            }
          }
        }
        return new RegExp(node.value);
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
  const found = deleteChildNode(formTreeData.value, id);
  if (found) {
    ElMessage.success("字段删除成功");
  }
};

// 删除子节点
const deleteChildNode = (nodes, id) => {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.children && node.children.length > 0) {
      const childIndex = node.children.findIndex((child) => child.id === id);
      if (childIndex > -1) {
        node.children.splice(childIndex, 1);
        return true;
      }
      // 递归查找子节点
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

// 将Mock数据转换为表单树数据
const mockDataToFormTree = (data, parentId = null) => {
  const treeData = [];

  if (typeof data === "object" && data !== null) {
    Object.entries(data).forEach(([key, value]) => {
      const node = {
        id: guid(),
        name: key,
        type: getNodeType(value),
        value:
          typeof value !== "object" || value instanceof RegExp
            ? String(value)
            : "",
        mockRule: "",
        parentId,
        children: [],
      };

      if (
        typeof value === "object" &&
        value !== null &&
        !(value instanceof RegExp)
      ) {
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
  } else if (value instanceof RegExp) {
    return "regexp";
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
  emit("save", { ...apiForm });
};
</script>

<style scoped lang="scss">
/* 表单树样式 */
.form-tree-container {
  width: 100%;
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
</style>
