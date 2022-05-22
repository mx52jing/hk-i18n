#! /usr/bin/env node
import path from 'node:path';
import ora from 'ora';
import fse from 'fs-extra';
import chalk from 'chalk';
import { transformFileAsync } from '@babel/core';
import babelPluginCollect from '../plugins/babel-plugin-collect';
import { getConfig } from "../utils/config";
import {
  collectTranslateFiles,
  defaultLanJSONData,
  genLanMap,
  writeJSONFile
} from '../utils/tool';
import { translateText } from '../utils/translateUtil';

import type { ILanJSON } from '../utils/tool';

const spinner = ora();

// 生成中文 JSON，并写入文件
const genCNJson = async (lanMap: Map<string, string>, jsonData: ILanJSON, cnJsonPath: string, cnJsonFileName: string) => {
  if(lanMap.size === Object.keys(jsonData.translation).length) {
    spinner.warn(`未收集到新的中文，[${chalk.yellow(`${cnJsonFileName}`)}]未更新`);
    process.exit();
  }
  lanMap.forEach((value, key) => {
    jsonData.translation[value] = key;
  });
  await writeJSONFile(cnJsonPath, jsonData);
}
// 生成其他语种
const genTranslateJSON = async (newJsonData: ILanJSON, translateLan: Array<string>, localesDir: string) => {
  const len = translateLan.length;
  let idx = 1;
  translateLan.forEach(async lan => {
    // 当前语言的JSON已经存在
    const jsonPath = path.resolve(localesDir, `${lan}.json`);
    const isExist = await fse.pathExists(jsonPath);
    if (!isExist) {
      spinner.warn(`未找到[${chalk.cyan(lan)}]，将自动创建`);
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
    for (const key of allKeys) {
      const val = newTranObj[key];
      const text = await translateText(val, lan);
      curLanData.translation[key] = text;
    }
    await writeJSONFile(jsonPath, curLanData);
    spinner.succeed(`[${chalk.cyan(jsonPath)}]文件写入成功`);
    if(idx++ === len) {
      spinner.succeed(chalk.green('所有语言文件均已生成完毕，程序结束'));
      process.exit();
    }
  })
}

!(async () => {
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
  const cnJsonPath = path.resolve(localesDir, cnJsonFileName);
  // 判断中文JSON是否存在
  const isCnJsonExist = await fse.pathExists(cnJsonPath);
  // 不存在中文JSON 直接创建一个
  if (!isCnJsonExist) {
    spinner.warn('未找到中文JSON文件，将自动创建');
    await writeJSONFile(cnJsonPath, defaultLanJSONData);
    spinner.succeed(`[${chalk.cyan(cnJsonPath)}]语言文件创建成功`)
  }
  // 读取中JSON的数据
  const jsonData: ILanJSON = await fse.readJSON(cnJsonPath);
  // 通过中问JSON生成Map => { 中文: "该中文的key" }
  const { lanMap } = genLanMap(jsonData);
  spinner.start('开始收集中文');
  const transformOptions = {
    presets: [["@babel/preset-typescript", { onlyRemoveTypeImports: true }]],
    plugins: [
      [babelPluginCollect, { lanMap }]
    ]
  }
  // 收集文件中所有的中文，存入lanMap中
  for (const file of allFiles) {
    await transformFileAsync(file, transformOptions);
  }
  spinner.succeed('中文收集完毕，开始生成JSON');
  // 生成中文JSON，并写入该文件
  await genCNJson(lanMap, jsonData, cnJsonPath, cnJsonFileName);
  spinner.succeed(`[${chalk.cyan(cnJsonPath)}]写入成功`);
  // 如果不需要翻译别的语言，结束
  if (!translateLan.length) return;
  // 根据中文文件生成其他语言文件
  await genTranslateJSON(jsonData, translateLan, localesDir);
})();