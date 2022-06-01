import * as t from '@babel/types';
import { judgeChinese, removeTextSpace } from "./tool";
// 是否当前节点禁用翻译
export const isDisabledI18n = (node: any) => {
  const { leadingComments } = node;
  if (!Array.isArray(leadingComments) || !leadingComments.length) return false;
  const obj = leadingComments.find(item => {
    return item.type === 'CommentBlock' && item.value.replace(/(\s|\n|\t)/g, '') === 'i18n-disable'
  });
  return !!obj;
}
// 跳过console中的中文
export const isConsoleChinese = (path: any): Boolean => {
  const parentNode = path.parent;
  if(
    !!parentNode &&
    t.isCallExpression(parentNode) &&
    t.isMemberExpression(parentNode.callee) &&
    t.isIdentifier(parentNode.callee.object) &&
    parentNode.callee.object.name === 'console'
  ) {
    // console打印的中文不搜集
    return true;
  }
  return false;
}
// 当前是ts声明的 例如 type IName = '哈哈' | '嘿嘿'
export const isTsType = (path: any) => {
  const { node } = path;
  return t.isTSLiteralType(path.parent);
}
// 跳过当前节点
export const skipCurrentStep = (path: any) => {
  const { node } = path;
  const { value } = node;
  // 禁用翻译或者文案中不包含中文或者console中的中文，就跳过
  if (isDisabledI18n(node) || !judgeChinese(value) || isConsoleChinese(path) || isTsType(path)) {
    return true;
  };
  return false;
}

// 生成翻译语句
interface ITranslateFn {
  ({t, key, cnText, importedName } : { t: any, key: string, cnText: string, importedName: string }): any;
}
export const makeTranslateStatament: ITranslateFn = ({ t, key, cnText, importedName }) => {
  const finialKey = Object.assign(t.stringLiteral(key), {
    trailingComments: [
      { type: 'CommentBlock', value: removeTextSpace(cnText) }
    ]
  })
  return t.callExpression(
    t.memberExpression(
      importedName,
      t.identifier('t')
    ),
    [finialKey]
  )
};