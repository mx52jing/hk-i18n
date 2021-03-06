#!/usr/bin/env node
import path from 'path';
import fse from 'fs-extra';
import xlsx from 'node-xlsx';
import ora from 'ora';
import chalk from 'chalk';
import Inquirer from 'inquirer';
import { getConfig } from '../utils/config';
import { normalizePath, getFileName } from '../utils/tool';
import type { ILanJSON } from '../utils/tool';
import { genExcelQuestions } from '../utils/questions';

const spinner = ora();
(async () => {
  const {
    localesDir,
    cnJsonFileName,
    excelDir
  } = await getConfig();
  if(!localesDir || !excelDir) {
    spinner.fail(chalk.red('Error: localesDir和excelDir字段不能为空，请先配置'));
    process.exit();  
  }
  const localePath = normalizePath(path.resolve(localesDir));
  const isLocales = await fse.pathExists(localePath);
  if(!isLocales) {
    spinner.fail(chalk.red(`[${localePath}]不存在`));
    process.exit(); 
  }
  const allLanJson = await fse.readdir(localePath);
  if (!allLanJson.length) {
    spinner.fail(chalk.red('未找到语言文件，请先生成语言文件'));
    process.exit();
  }
  const { fileName, sheetName } = await Inquirer.prompt(genExcelQuestions)
  if (!fileName) {
    spinner.fail(chalk.red('Error：请指定生产的excel文件名称'))
    process.exit(2);
  }
  const otherLan = allLanJson.filter(key => key.toLocaleLowerCase() !== cnJsonFileName.toLocaleLowerCase());
  const titleArr = otherLan.map(item => getFileName(item));
  // 先设置excel头部
  const data = [
    ["key", getFileName(cnJsonFileName), ...titleArr]
  ];
  // 获取中文JSON路径 并且读取JSON文件的内容
  const cnJsonPath = normalizePath(path.resolve(localesDir, cnJsonFileName));
  const cnJsonData: ILanJSON = await fse.readJSON(cnJsonPath);
  const { translation } = cnJsonData;
  const promises = otherLan.map(item => {
    const jsonPath = normalizePath(path.resolve(localesDir, `${item}`));
    return fse.readJSON(jsonPath);
  });
  // 获取除了中文的其他语言JSON
  const lanData: Array<ILanJSON> = await Promise.all(promises);
  // 先生成中文的数据
  for(const key in translation) {
    if(translation.hasOwnProperty(key)) {
      data.push(
        [key, translation[key]]
      )
    }
  }
  // 根据中文JSON，组装其他语言的数据
  if(!!lanData.length) {
    lanData.forEach(d => {
      const { translation: curTranslation } = d;
      const allKeys = Object.keys(translation);
      allKeys.forEach((key, index) => {
        const idx = index + 1;
        const val = curTranslation[key];
        if(!val) {
          spinner.warn(chalk.red(`[${key}]对应的翻译有缺失`));
          return;
        }
        data[idx].push(val);
      })
    })
  }
  const excelPath = normalizePath(path.resolve(excelDir, `${fileName}.xlsx`))
  const buffer = xlsx.build([{ name: sheetName, data, options: {} }]);
  await fse.outputFile(excelPath, buffer);
  spinner.succeed(chalk.green('成功生成excel文件'))
})();
