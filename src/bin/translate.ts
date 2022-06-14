#!/usr/bin/env node
import path from 'node:path';
import fse from 'fs-extra';
import chalk from "chalk";
import ora from 'ora';
import Inquirer from 'inquirer';
import { getConfig } from "../utils/config";
import { normalizePath, writeJSONFile, defaultLanJSONData } from '../utils/tool';
import { parallelTranslate, timeoutKey } from '../utils/translateUtil';
import { translateQuestions, translateKeysQs } from '../utils/questions';

import type { ILanJSON } from '../utils/tool';

const spinner = ora();

/**
 * 生成其他语种
 * @param cnJsonData 中文JSON数据
 * @param translateLan 需要翻译的语种数组
 * @param localesDir 存储多语言的文件夹名称
 * @param forceUpdate 是否强制更新
 */
interface ITranslateParams {
  cnJsonData: ILanJSON;
  translateLan: Array<string>;
  localesDir: string;
  forceUpdate: boolean;
  keys?: Array<string>;
}
const genTranslateJSON = async ({ cnJsonData, translateLan, localesDir, forceUpdate, keys = [] }: ITranslateParams) => {
  const len = translateLan.length;
  let idx = 1;
  translateLan.forEach(async lan => {
    if (!lan) {
      spinner.fail(`Error: 当前语种[${lan}]不合法`);
      return;
    }
    // 当前语言的JSON已经存在
    const curJsonPath = normalizePath(path.resolve(localesDir, `${lan}.json`));
    const isExist = await fse.pathExists(curJsonPath);
    // 如果强制更新或者不存在当前语言包
    if (forceUpdate || !isExist) {
      spinner.warn(`未找到[${chalk.cyan(`${lan}.json`)}]/启用强制更新，将自动创建`);
      await writeJSONFile(curJsonPath, defaultLanJSONData);
      spinner.succeed(`[${chalk.cyan(curJsonPath)}]文件创建成功`)
    }
    const curLanData: ILanJSON = await fse.readJSON(curJsonPath);
    // translation => { "key": "语言" }
    const { translation: oldTranObj } = curLanData;
    const { translation: newTranObj } = cnJsonData;
    const newTranKeys = Object.keys(newTranObj);
    const lastID = Object.keys(oldTranObj).pop();
    let allKeys = [];
    // 指定了翻译哪些key，就只翻译部分的
    if (!!keys.length) {
      allKeys = keys;
    } else {
      // 从新的JSON的哪一条数据的索引开始翻译
      let startIdx = 0;
      if (!!lastID) {
        startIdx = newTranKeys.indexOf(lastID) + 1;
      }
      // 获取所有要翻译的key
      allKeys = newTranKeys.slice(startIdx);
    }
    if (!allKeys.length) {
      spinner.warn(`[${chalk.yellow(`${lan}.json`)}]未更新`);
      return;
    }
    spinner.start(`开始翻译中文为[${chalk.cyan(lan)}]，这可能需要一段时间`);
    await parallelTranslate(curLanData, newTranObj, allKeys, lan);
    await writeJSONFile(curJsonPath, curLanData);
    spinner.succeed(`[${chalk.cyan(curJsonPath)}]文件写入成功`);
    if (idx++ === len) {
      spinner.succeed(chalk.green('所有语言文件均已生成完毕，程序结束'));
    }
  })
}

!(async () => {
  const {
    cnJsonFileName,
    localesDir,
    translateLan
  } = await getConfig();
  // 当前中文JSON的路径
  const cnJsonPath = normalizePath(path.resolve(localesDir, cnJsonFileName));
  // 判断中文JSON是否存在
  const isCnJsonExist = await fse.pathExists(cnJsonPath);
  if (!isCnJsonExist) {
    spinner.fail(chalk.red('Error: 请先收集中文'));
    process.exit(2);
  };
  if (!translateLan?.length) {
    spinner.warn(chalk.yellow('没有需要翻译其他语言'));
    process.exit(1);
  };
  const { forceUpdate } = await Inquirer.prompt(translateQuestions);
  let keys = [];
  if(!forceUpdate) {
    const { keys: tranKeys } = await Inquirer.prompt(translateKeysQs);
    keys = tranKeys.filter(Boolean);
  }
  if (!Array.isArray(keys)) {
    spinner.fail(chalk.red('Error: keys格式错误'));
    return;
  }
  const cnJsonData: ILanJSON = await fse.readJSON(cnJsonPath);
  // 根据中文文件生成其他语言文件
  await genTranslateJSON({ cnJsonData, translateLan, localesDir, forceUpdate, keys });
  if(!!timeoutKey) {
    spinner.info(`翻译超时的key为${timeoutKey}`)
  }
})();
