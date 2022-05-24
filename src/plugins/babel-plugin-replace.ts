import * as t from '@babel/types';
import { judgeChinese, removeTextSpace } from '../utils/tool';
import { skipCurrentStep, makeTranslateStatament } from '../utils/babelUtils';

const importDeclarationVistor = {
  ImportDeclaration(path: any) {
    const { node } = path;
    const { specifiers, source } = node;
    const specifier = specifiers[0];
    if (
      //@ts-ignore
      source.value === this.config.libName &&
      specifier.type === 'ImportDefaultSpecifier'
    ) {
      //@ts-ignore
      Object.assign(this.config, {
        isImported: true,
        importedName: specifier.local.name
      })
      path.stop();
      return;
    }
  }
}

interface IFnArgs {
  lanMap: Map<string, string>;
  libName: string;
}
interface IState {
  [key: string]: any;
}
const babelPluginReplace = ({ lanMap, libName }: IFnArgs) => {
  const state: IState = {}
  return {
    Program: {
      enter(path: any) {
        const { node } = path;
        const config = { isImported: false, importedName: libName, libName }
        path.traverse(importDeclarationVistor, { config });
        if (config.isImported) {
          state.importedName = t.identifier(config.importedName)
          return;
        };
        // 生成引入的库的名称aaa import aaa from 'xxx'
        const importedName = t.identifier(path.scope.generateUid(libName));
        state.importedName = importedName;
        // 生成引用语句
        const importDeclaration = t.importDeclaration(
          [t.importDefaultSpecifier(importedName)],
          t.stringLiteral(libName)
        );
        node.body.unshift(importDeclaration);
      }
    },
    StringLiteral(path: any) {
      const { node } = path;
      const { value } = node;
      if (skipCurrentStep(node)) {
        path.skip();
        return;
      }
      const newVal = removeTextSpace(value);
      const key = lanMap.get(newVal);
      if (!key) {
        path.skip();
        return;
      }
      const parent = path.parent;
      const newAst = makeTranslateStatament({ t, key, cnText: newVal, importedName: state.importedName });
      let newNode;
      switch (parent.type) {
        case 'JSXAttribute': // <A title="中文" />
          newNode = t.jsxExpressionContainer(newAst)
          break;
        case 'AssignmentExpression': // const a = '中文'
          newNode = t.assignmentExpression(
            '=',
            parent.left,
            newAst
          )
          break;
        default:
          newNode = newAst;
      }
      path.replaceWith(newNode);
      path.skip();
    },
    JSXText(path: any) {
      const { node } = path;
      const { value } = node;
      if (skipCurrentStep(node)) {
        path.skip();
        return;
      }
      const newVal = removeTextSpace(value);
      const key = lanMap.get(newVal);
      if (!key) {
        path.skip();
        return;
      }
      const newAst = makeTranslateStatament({ t, key, cnText: newVal, importedName: state.importedName });
      path.replaceWith(
        t.jsxExpressionContainer(newAst)
      )
      path.skip();
    },
    TemplateLiteral(path: any) {
      const { node } = path;
      const { quasis, expressions } = node;
      if (quasis.every((q: any) => !judgeChinese(q.value.raw))) {
        path.skip();
        return;
      }
      let idx = 0;
      quasis.forEach((item: any, index: number) => {
        if (item.type === 'TemplateElement') {
          const value = item.value.raw;
          if (!judgeChinese(value)) return;
          const newVal = removeTextSpace(value);
          const key = lanMap.get(newVal);
          if (!key) return;
          expressions.splice(index + idx, 0, makeTranslateStatament({ t, key, cnText: newVal, importedName: state.importedName }));
          idx++;
          // 每增添一个表达式都需要变化原始节点,并新增下一个字符节点
          item.value = { raw: '', cooked: '' };
        }
      });
      while (idx--) {
        // 每增添一个表达式都需要变化原始节点,并新增下一个字符节点
        quasis.push(t.templateElement({ raw: '', cooked: '' }, idx === 1 ? true : false));
      }
      path.skip();
    }
  }
}

export default babelPluginReplace;
