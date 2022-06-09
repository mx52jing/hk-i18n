#!/usr/bin/env node
import path from 'node:path';
import ora from 'ora';
import fse from 'fs-extra';
import chalk from 'chalk';
import traverse from '@babel/traverse';
import { parse } from '@babel/parser';
import Inquirer from 'inquirer';
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
import { collectQuestions } from '../utils/questions';

import type { ILanJSON } from '../utils/tool';

const spinner = ora();

/**
 * 生成中文 JSON，并写入文件
 * @param lanMap 中文JSON map 结构 
 * @param cnJsonData 中文JSON数据
 * @param cnJsonPath 中文JSON文件路径
 * @param cnJsonFileName 中文JSON文件名称
 * @param forceUpdate 是否强制更新
 * @returns 
 */
const genCNJson = async (lanMap: Map<string, string>, cnJsonData: ILanJSON, cnJsonPath: string, cnJsonFileName: string, forceUpdate: boolean) => {
  if (lanMap.size === Object.keys(cnJsonData.translation).length && !forceUpdate) {
    spinner.warn(`未收集到新的中文，[${chalk.yellow(`${cnJsonFileName}`)}]未更新`);
    return;
  }
  lanMap.forEach((value, key) => {
    const val = cnJsonData.translation[value];
    if (!val) {
      cnJsonData.translation[value] = formatLineSymbol(key);
    }
  });
  await writeJSONFile(cnJsonPath, cnJsonData);
  spinner.succeed(`[${chalk.cyan(cnJsonPath)}]写入成功`);
}
;(async () => {
  try {
    const {
      matchOpts,
      localesDir,
      cnJsonFileName
    } = await getConfig();
    const { forceUpdate } = await Inquirer.prompt(collectQuestions);
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
    // 读取中文JSON的数据
    const cnJsonData: ILanJSON = await fse.readJSON(cnJsonPath);
    // 通过中问JSON生成Map => { 中文: "该中文的key" }
    const { lanMap } = genLanMap(cnJsonData, forceUpdate);
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
      }
    }
    spinner.succeed('中文收集完毕');
    // 生成中文JSON，并写入该文件
    await genCNJson(lanMap, cnJsonData, cnJsonPath, cnJsonFileName, forceUpdate);
  } catch (e) {
    spinner.fail(chalk.red(`Error: 运行出错了，请检查配置路径中的代码是否含打包过后的代码, ${e}`));
  }
})();