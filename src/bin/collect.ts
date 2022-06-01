#!/usr/bin/env node
import path from 'node:path';
import ora from 'ora';
import fse from 'fs-extra';
import chalk from 'chalk';
import traverse from '@babel/traverse';
import { parse } from '@babel/parser'
import babelPluginCollect from '../plugins/babel-plugin-collect';
import { getConfig } from "../utils/config";
import {
  collectTranslateFiles,
  defaultLanJSONData,
  genLanMap,
  writeJSONFile,
  normalizePath,
  judgeChinese,
  formatLineSymbol
} from '../utils/tool';
import { parallelTranslate } from '../utils/translateUtil';

import type { ILanJSON } from '../utils/tool';

const spinner = ora();

// 生成中文 JSON，并写入文件
const genCNJson = async (lanMap: Map<string, string>, jsonData: ILanJSON, cnJsonPath: string, cnJsonFileName: string, forceUpdate: boolean) => {
  if (lanMap.size === Object.keys(jsonData.translation).length && !forceUpdate) {
    spinner.warn(`未收集到新的中文，[${chalk.yellow(`${cnJsonFileName}`)}]未更新`);
    return;
  }
  lanMap.forEach((value, key) => {
    const val = jsonData.translation[value];
    if (!val) {
      jsonData.translation[value] = formatLineSymbol(key);
    }
  });
  await writeJSONFile(cnJsonPath, jsonData);
  spinner.succeed(`[${chalk.cyan(cnJsonPath)}]写入成功`);
}
// 生成其他语种
const genTranslateJSON = async (newJsonData: ILanJSON, translateLan: Array<string>, localesDir: string, forceUpdate: boolean) => {
  const len = translateLan.length;
  let idx = 1;
  translateLan.forEach(async lan => {
    if (!lan) {
      spinner.fail(`Error: 当前语种[${lan}]不合法`);
      process.exit(2);
    }
    // 当前语言的JSON已经存在
    const jsonPath = normalizePath(path.resolve(localesDir, `${lan}.json`));
    const isExist = await fse.pathExists(jsonPath);
    // 如果强制更新或者不存在当前语言包
    if (forceUpdate || !isExist) {
      spinner.warn(`未找到[${chalk.cyan(`${lan}.json`)}]/启用强制更新，将自动创建`);
      await writeJSONFile(jsonPath, defaultLanJSONData);
      spinner.succeed(`[${chalk.cyan(jsonPath)}]文件创建成功`)
    }
    const curLanData: ILanJSON = await fse.readJSON(jsonPath);
    // translation => { "key": "语言" }
    const { translation: oldTranObj } = curLanData;
    const { translation: newTranObj } = newJsonData;
    const newTranKeys = Object.keys(newTranObj);
    const lastID = Object.keys(oldTranObj).pop();
    // 从新的JSON的哪一条数据的索引开始翻译
    let startIdx = 0;
    if (!!lastID) {
      startIdx = newTranKeys.indexOf(lastID) + 1;
    }
    // 获取所有要翻译的key
    const allKeys = newTranKeys.slice(startIdx);
    if (!allKeys.length) {
      spinner.warn(`[${chalk.yellow(`${lan}.json`)}]未更新`)
      return;
    }
    spinner.start(`开始翻译中文为[${chalk.cyan(lan)}]，这可能需要一段时间`);
    await parallelTranslate(curLanData, newTranObj, allKeys, lan);
    await writeJSONFile(jsonPath, curLanData);
    spinner.succeed(`[${chalk.cyan(jsonPath)}]文件写入成功`);
    if (idx++ === len) {
      spinner.succeed(chalk.green('所有语言文件均已生成完毕，程序结束'));
      process.exit();
    }
  })
}

interface IOpts {
  forceUpdate: boolean;
}
const collect = async ({ forceUpdate }: IOpts) => {
  try {
    const {
      matchOpts,
      localesDir,
      cnJsonFileName,
      translateLan
    } = await getConfig();
    spinner.start('开始收集项目文件');
    // 获取所有匹配的的文件列表
    const allFiles = await collectTranslateFiles(...matchOpts);
    spinner.succeed(`文件收集成功，一共有[${chalk.cyan(allFiles.length)}]个文件`);
    if (!allFiles.length) {
      spinner.warn('文件数量为空，任务终止')
      process.exit(1)
    }
    spinner.start('开始处理中文JSON');
    // 当前中文JSON的路径
    const cnJsonPath = normalizePath(path.resolve(localesDir, cnJsonFileName));
    // 判断中文JSON是否存在
    const isCnJsonExist = await fse.pathExists(cnJsonPath);
    // 不存在中文JSON 直接创建一个
    if (forceUpdate || !isCnJsonExist) {
      spinner.warn('未找到中文JSON文件/启用强制更新，将自动创建');
      await writeJSONFile(cnJsonPath, defaultLanJSONData);
      spinner.succeed(`[${chalk.cyan(cnJsonPath)}]语言文件创建成功`)
    }
    // 读取中JSON的数据
    const jsonData: ILanJSON = await fse.readJSON(cnJsonPath);
    // 通过中问JSON生成Map => { 中文: "该中文的key" }
    const { lanMap } = genLanMap(jsonData, forceUpdate);
    spinner.start('开始收集中文');
    // 收集文件中所有的中文，存入lanMap中
    for (const file of allFiles) {
      try {
        const code = await fse.readFile(file, { encoding: 'utf-8' });
        if (!judgeChinese(code)) continue;
        const ast = parse(code, {
          sourceType: "module",
          plugins: ["jsx", "typescript"]
        });
        traverse(ast, babelPluginCollect(lanMap));
      } catch (error) {
        spinner.fail(chalk.red(`Error: 运行报错，出错的文件为=>[${file}]`));
        process.exit(2);
      }
    }
    spinner.succeed('中文收集完毕，开始生成JSON');
    // 生成中文JSON，并写入该文件
    await genCNJson(lanMap, jsonData, cnJsonPath, cnJsonFileName, forceUpdate);
    // 如果不需要翻译别的语言，结束
    if (!translateLan.length) return;
    // 根据中文文件生成其他语言文件
    await genTranslateJSON(jsonData, translateLan, localesDir, forceUpdate);
  } catch (e) {
    spinner.fail(chalk.red(`Error: 运行出错了，请检查配置路径中的代码是否含打包过后的代码, ${e}`));
  }
}

export default collect;