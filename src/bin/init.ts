#!/usr/bin/env node
import path from 'node:path'
import fse from 'fs-extra';
import chalk from "chalk";
import ora from 'ora';
import { configPath } from "../utils/config";
import { normalizePath } from '../utils/tool';

const spinner = ora();
!(async () => {
  const isConfigPath = await fse.pathExists(configPath);
  if (isConfigPath) {
    spinner.fail(chalk.red('Error：配置文件已存在'));
    process.exit(2);
  }
  await fse.copy(normalizePath(path.resolve(__dirname, '../config/i18n.config.json')), configPath)
  spinner.succeed(chalk.green('Success：初始化配置完成'))
})();