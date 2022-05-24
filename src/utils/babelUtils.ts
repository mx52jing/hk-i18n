import { judgeChinese } from "./tool";
// 是否当前节点禁用翻译
export const isDisabledI18n = (node: any) => {
  const { leadingComments } = node;
  if (!Array.isArray(leadingComments) || !leadingComments.length) return false;
  const obj = leadingComments.find(item => {
    return item.type === 'CommentBlock' && item.value.replace(/(\s|\n|\t)/g, '') === 'i18n-disable'
  });
  return !!obj;
}
// 跳过当前节点
export const skipCurrentStep = (node: any) => {
  const { value } = node;
  // 禁用翻译或者文案中不包含中文，就跳过
  if (isDisabledI18n(node) || !judgeChinese(value)) {
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
      { type: 'CommentBlock', value: cnText }
    ]
  })
  return t.callExpression(
    t.memberExpression(
      importedName,
      t.identifier('t')
    ),
    [finialKey]
  )
}