#!/usr/bin/env node
import path from 'path';
import fse from 'fs-extra';
import xlsx from 'node-xlsx';
import ora from 'ora';
import chalk from 'chalk';
import { getConfig } from '../utils/config';
import { normalizePath, getFileName } from '../utils/tool';
import type { ILanJSON } from '../utils/tool';

interface IProps {
  fileName: string;
  sheetName: string;
}
const spinner = ora();
const buildExcel = async ({ fileName, sheetName }: IProps) => {
  if (!fileName) {
    spinner.fail(chalk.red('Error：请指定生产的excel文件名称'))
    process.exit(2);
  }
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
  const otherLan = allLanJson.filter(key => key !== cnJsonFileName);
  const titleArr = otherLan.map(item => getFileName(item))
  const data = [
    ["key", getFileName(cnJsonFileName), ...titleArr]
  ];
  const cnJsonPath = normalizePath(path.resolve(localesDir, cnJsonFileName));
  const cnJsonData: ILanJSON = await fse.readJSON(cnJsonPath);
  const { translation } = cnJsonData;
  const promises = otherLan.map(item => {
    const jsonPath = normalizePath(path.resolve(localesDir, `${item}`));
    return fse.readJSON(jsonPath);
  });
  const lanData: Array<ILanJSON> = await Promise.all(promises);
  for(const key in translation) {
    if(translation.hasOwnProperty(key)) {
      data.push(
        [key, translation[key]]
      )
    }
  }
  if(!!lanData.length) {
    lanData.forEach(d => {
      const { translation } = d;
      const allKeys = Object.keys(translation);
      allKeys.forEach((key, index) => {
        const idx = index + 1;
        const val = translation[key]
        if(data[idx]?.[0] === key) {
          data[idx].push(val)
        }
      })
    })
  }
  const excelPath = normalizePath(path.resolve(excelDir, `${fileName}`))
  const buffer = xlsx.build([{ name: sheetName, data, options: {} }]);
  await fse.outputFile(excelPath, buffer);
  spinner.succeed(chalk.green('成功生成excel文件'))
}

export default buildExcel;
