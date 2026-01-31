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
