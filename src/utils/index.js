export function guid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function stringify(obj) {
  // 处理基本类型：null、undefined、string、number、boolean
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    // 字符串需要加引号
    if (typeof obj === 'string') {
      return `"${obj}"`;
    }
    // 其他基本类型直接返回字符串形式
    return String(obj);
  }

  // 处理正则表达式对象
  if (obj instanceof RegExp) {
    return `"${obj.toString()}"`;
  }

  // 处理数组
  if (Array.isArray(obj)) {
    const elements = obj.map(item => stringify(item));
    return `[${elements.join(',')}]`;
  }

  // 处理普通对象
  const pairs = [];
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      // 跳过 undefined 和 function 类型的属性
      if (value !== undefined && typeof value !== 'function') {
        pairs.push(`"${key}":${stringify(value)}`);
      }
    }
  }
  return `{${pairs.join(',')}}`;
}

export function jsonParse(jsonString) {
  const parseWithFallback = (input) => {
    try {
      return JSON.parse(input);
    } catch (error) {
      const fixed = input.replace(
        /"\/([^"]*?)\/([gimsuy]*)"/g,
        (match, body, flags) => {
          const escapedBody = body.replace(/\\/g, '\\\\');
          return `"\/${escapedBody}\/${flags}"`;
        },
      );
      return JSON.parse(fixed);
    }
  };

  const parsed = parseWithFallback(jsonString);
  
  // 递归遍历对象，只处理明确的正则表达式
  function processObject(obj) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        
        if (typeof value === 'object' && value !== null) {
          processObject(value); // 递归处理嵌套对象
        } else if (typeof value === 'string') {
          // 只处理值看起来像正则，且键名不包含 Mock.js 语法的情况
          if (value.startsWith('/') && 
              !key.includes('|') && 
              !key.includes('@')) {
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
              // 保持原值
            }
          }
        }
      }
    }
  }
  
  processObject(parsed);
  return parsed;
}


/**
 * 从节点树中过滤出符合条件的节点
 * @param {Array|Object} tree - 节点树（数组或单个节点对象）
 * @param {Function} predicate - 过滤条件函数，返回true表示保留该节点
 * @param {Object} options - 配置选项
 * @param {string} options.childrenKey - 子节点属性名，默认为'children'
 * @param {boolean} options.includeParent - 是否保留父节点（当子节点匹配时），默认为true
 * @returns {Array} 过滤后的节点数组
 */
export function filterTreeNodes(tree, predicate, options = {}) {
  const {
    childrenKey = 'children'
  } = options;

  // 处理数组形式的树
  if (Array.isArray(tree)) {
    const result = tree
      .map(node => filterTreeNodes(node, predicate, options))
      .filter(item => item !== null);
    return result.length > 0 ? result : null;
  }

  // 检查当前节点是否匹配
  const currentNodeMatch = predicate(tree);
  
  // 如果当前节点不匹配，直接返回null（包括所有子节点都会被过滤）
  if (!currentNodeMatch) {
    return null;
  }

  // 处理子节点
  const children = tree[childrenKey];
  let filteredChildren = null;
  
  if (children && Array.isArray(children)) {
    filteredChildren = children
      .map(child => filterTreeNodes(child, predicate, options))
      .filter(item => item !== null);
  }

  // 构建返回结果
  return {
    ...tree,
    [childrenKey]: filteredChildren && filteredChildren.length > 0 
      ? filteredChildren 
      : undefined
  };
}






