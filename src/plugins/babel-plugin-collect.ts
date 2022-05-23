import {
  judgeChinese,
  removeTextSpace,
  lanId,
  upDataLanId,
} from '../utils/tool';
import { skipCurrentStep, isDisabledI18n } from '../utils/babelUtils';

const babelPluginCollect = async () => {
  return {
    visitor: {
      'StringLiteral|JSXText'(path: any, state: any) {
        const { node } = path;
        const { value } = node;
        if(skipCurrentStep(node)) {
          path.skip();
          return;
        }
        const { lanMap } = state.opts;
        const newVal = removeTextSpace(value)
        if(!lanMap.get(newVal)) {
          upDataLanId();
          lanMap.set(newVal, lanId);
          path.skip();
        }
      },
      TemplateLiteral(path: any, state: any) {
        // 收集模版字符串中的中文
        const { node } = path;
        if(isDisabledI18n(node)) {
          path.skip();
          return;
        }
        const { quasis } = node;
        const chineses = quasis.reduce((memo: Array<string>, cur: any) => {
          const val = cur.value.raw;
          if(!judgeChinese(val)) {
            return memo;
          }
          const newVal = removeTextSpace(val);
          memo.push(newVal);
          return memo;
        }, [])
        if(!chineses.length) {
          path.skip();
          return;
        }
        const { lanMap } = state.opts;
        chineses.forEach((item: string) => {
          if(!lanMap.get(item)) {
            upDataLanId();
            lanMap.set(item, lanId);
          }
        });
        path.skip();
      } 
    }
  }
}

export default babelPluginCollect;
