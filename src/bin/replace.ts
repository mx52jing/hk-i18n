#! /usr/bin/env node
import path from 'node:path';
import ora from 'ora';
import fse from 'fs-extra';
import chalk from 'chalk';
import { transformFileAsync } from '@babel/core';
import babelPluginReplace from '../plugins/babel-plugin-replace';
import { getConfig } from "../utils/config";
import { judgeChinese, collectTranslateFiles, genLanMap } from '../utils/tool';

import type { ILanJSON } from '../utils/tool';

const spinner = ora();

!(async () => {
  const {
    matchOpts,
    localesDir,
    cnJsonFileName,
  } = await getConfig();
  const cnJsonPath = path.resolve(localesDir, cnJsonFileName);
  const isCnJsonExist = await fse.pathExists(cnJsonPath);
  if (!isCnJsonExist) {
    spinner.fail(chalk.red('Error：未找到中文json文件，请先生成中文json文件或检查中文json配置路径是否正确'));
    process.exit(2);
  }
  spinner.start('开始收集要替换的文件');
  const allFiles = await collectTranslateFiles(...matchOpts);
  spinner.succeed(`文件收集成功，一共有[${chalk.cyan(allFiles.length)}]个文件`);
  if (!allFiles.length) {
    spinner.warn('收集到的文件数量为空，任务终止')
    process.exit(1);
  }
  spinner.info('开始替换中文，这可能需要一段时间');
  // 读取中JSON的数据
  const jsonData: ILanJSON = await fse.readJSON(cnJsonPath);
  // 通过中问JSON生成Map => { 中文: "该中文的key" }
  const { lanMap } = genLanMap(jsonData);
  const transformOptions = {
    presets: [
      ["@babel/preset-typescript", { onlyRemoveTypeImports: true }]
    ],
    plugins: [
      [babelPluginReplace, { lanMap, libName: 'i18next' }]
    ]
  }
  const len = allFiles.length;
  let idx = 1;
  allFiles.forEach(async (file: string) => {
    const code = await fse.readFile(file, { encoding: 'utf-8' });
    if (!judgeChinese(code)) return;
    const res = await transformFileAsync(file, transformOptions);
    if(!res?.code) return;
    await fse.outputFile(file, res.code)
    spinner.succeed(`[${chalk.green(file)}]`);
    if(idx++ === len) {
      spinner.succeed(chalk.green('所有文件中文均已替换完毕，程序结束'));
      process.exit();
    }
  });
})();