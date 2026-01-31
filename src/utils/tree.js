/**
 * 查找节点父节点 / 父节点链
 * @param {Array} tree 树数据
 * @param {string|number} targetId 目标节点id
 * @param {Object} options 配置
 * @param {string} options.idKey 节点id字段名
 * @param {string} options.childrenKey 子节点字段名
 * @param {boolean} options.returnPath 是否返回父节点链
 * @returns {Object|null|Array}
 */
export function findParent(tree, targetId, options = {}) {
  const {
    idKey = 'id',
    childrenKey = 'children',
    returnPath = false,
  } = options;

  const path = [];

  function dfs(nodes, parent) {
    if (!nodes) return null;

    for (const node of nodes) {
      if (node[idKey] === targetId) {
        if (returnPath) return [...path];
        return parent || null;
      }

      path.push(node);
      const res = dfs(node[childrenKey], node);
      if (res) return res;
      path.pop();
    }

    return null;
  }

  return dfs(tree, null);
}
