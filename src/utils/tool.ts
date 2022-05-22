import path from 'path';
import glob from 'glob';
import ora from 'ora';
import chalk from 'chalk';
import fse from 'fs-extra'

import type { IOptions } from 'glob';
import type { WriteOptions } from 'fs-extra';
const spinner = ora();
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
        resolve([])
        process.exit(2);
      }
      const collectedFiles = files.map((filePath: string) => {
        if(!path.isAbsolute(filePath)) {
          return path.resolve(filePath);
        }
        return filePath;
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
// 根据当前中稳JSON生成Map结构
export const genLanMap= (lanData: ILanJSON) => {
  const { translation } = lanData;
  let lastID = Object.keys(translation).pop();
  // 当前还没有多语言
  if(!lastID) {
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