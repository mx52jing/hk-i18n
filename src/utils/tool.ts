import path from 'path';
import glob from 'glob';
import chalk from 'chalk';
import fse from 'fs-extra'

import type { IOptions } from 'glob';
import type { WriteOptions } from 'fs-extra';
// 判断文件是否包含非注释中文
export const chineseReg = /(?<!\/\/\s*.*)(?<!\/\*+.*)[\u4e00-\u9fa5]+/;

// 判断是否有中文
const hasChineseReg = /[\u4e00-\u9fa5]/;
export const judgeChinese = (text: string) => hasChineseReg.test(text);

// 处理文案 去除空格
const spaceReg = /(\s|\n|\t)/g;
export const removeTextSpace = (text: string) => text.replace(spaceReg, '');

// 收集所有匹配的文件
export const collectTranslateFiles = (pattern: string, options: IOptions): Promise<Array<string>> => {
  return new Promise((resolve, reject) => {
    glob(pattern, options, (err, files) => {
      if(!!err) {
        console.log(chalk.red('Error： 匹配文件出错，请检查配置文件'));
        resolve([]);
        process.exit(2);
      }
      const collectedFiles = files.map((filePath: string) => {
        if(!path.isAbsolute(filePath)) {
          return normalizePath(path.resolve(filePath));
        }
        return normalizePath(filePath);
      })
      resolve(collectedFiles)
    })
  })
};

// 默认多语言JSON文件格式类型
export interface ILanJSON {
  translation: {
    [key: string]: string
  }
}
// 默认多语言JSON文件格式
export const defaultLanJSONData: ILanJSON = {
  translation: {}
}

// json文件的多语言key
export let lanId = 99999;
// 更新json文件的多语言key
export const upDataLanId = () => lanId++;
const defaultLanMap = new Map<string, string>();
// 根据当前中文JSON生成Map结构
export const genLanMap= (lanData: ILanJSON, forceUpdate: boolean) => {
  const { translation } = lanData;
  let lastID = Object.keys(translation).pop();
  // 当前还没有多语言或者要强制更新语言文件
  if(forceUpdate || !lastID) {
    return {
      lanMap: defaultLanMap
    }
  }
  lanId = +lastID;
  for(const id in translation) {
    if(translation.hasOwnProperty(id)) {
      defaultLanMap.set(translation[id], id)
    }
  }
  return {
    lanMap: defaultLanMap
  }
}

// 写入JSON文件
export const writeJSONFile = async (path: string, data: any, options?: WriteOptions) => {
  if(!options) {
    options = { spaces: '\t' }
  }
  await fse.outputJson(path, data, options)
}

type ITask = (...args: any) => Promise<any>;
// 并发执行异步任务
export const parallelCallFn = (tasks: Array<ITask>, maxCallNum: number) => {
  return new Promise(resolve => {
    const queue: Array<Function> = [];
    const resolved: any = [],
      rejected: any = []
    let idx = 0;
    let finishedIdx = 0;
    const next = (task: ITask) => {
      idx++;
      task()
        .then((value: any) => {
          resolved.push({ status: 'resolved', value })
        })
        .catch((reason: any) => {
          rejected.push({ status: 'resolved', reason })
        })
        .finally(() => {
          if(finishedIdx++ === tasks.length - 1) {
            resolve({ resolved, rejected });
            return;
          }
          idx--;
          const fn = queue.shift();
          if(!!fn) {
            fn();
          }
        })
    }
    tasks.forEach((task) => {
      if(idx > maxCallNum) {
        queue.push(() => next(task));
        return;
      }
      next(task);
    })
  })
};
// 格式化路径
export const normalizePath = (path: string) => {
  return path.replace(/\\/g, '/')
}

//获取文件名
export const getFileName = (name: string) => {
  const basename = path.basename(name);
  return basename.substring(0, basename.lastIndexOf('.'));
}

// 是ts/tsx文件
const tsReg = /\.(ts|tsx)$/;
export const isTsFile = (fileName: string) => tsReg.test(fileName);

// 移除文字前后空格
export const textTrim = (text: string) => {
  if(!text) return "";
  return text.trim();
}

// 格式化换行等符号
const lineSymbolReg = /(\\n)|(\\r\\n)|(\\n\\r)|(\\r)/g;
export const formatLineSymbol = (text: string) => {
  if(!text) return "";
  return text.replace(lineSymbolReg, "\n")
}

export const compose = (...fns: Array<Function>) => {
  if(!fns.length) return <T>(arg: T) => arg;
  if(fns.length === 1) return fns[0];
  return fns.reduce((a, b) => (...args: any[]) => a(b(...args)));
}
// 格式化文案 去除前后空格 和格式化换行
export const formatText = compose(formatLineSymbol, textTrim)