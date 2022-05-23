import path from 'path';
import fse from 'fs-extra';
import chalk from "chalk";
import ora from 'ora';
import defaultConfig from '../config/i18n.config.json'
import { normalizePath } from './tool';

import type { IOptions } from 'glob';

const spinner = ora();
export const configPath = normalizePath(path.resolve('i18n.config.json'));
export interface IConfig {
  matchOpts: [
    string,
    IOptions
  ],
  localesDir: string,
  cnJsonFileName: string
  translateLan: Array<string>;
  excelDir: string;
}

let cacheConfig: IConfig;
export const getConfig = async () => {
  if (cacheConfig) {
    return cacheConfig;
  }
  const isConfigExist = await fse.pathExists(configPath);
  if(!isConfigExist) {
    spinner.fail(chalk.red('Error：未获取到配置文件，请先生成配置文件'));
    process.exit(2);
  }
  const config = require(configPath) as IConfig;
  if(!Array.isArray(config.translateLan)) {
    spinner.fail(chalk.red('Error：translateLan必须为数组'));
    process.exit(2); 
  }
  const allKeys = Object.keys(config) as Array<keyof IConfig>;
  allKeys.forEach(item => {
    if(!config[item]) {
      // @ts-ignore
      config[item] = defaultConfig[item]
    }
  });
  cacheConfig = config;
  spinner.stop();
  return config as IConfig
}
