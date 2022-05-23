#!/usr/bin/env node
import { program } from 'commander';
import chalk from "chalk";
import collect from './collect';
import buildExcel from './buildExcel';

const pkg = require('../package.json')

program.version(pkg.version)
program
    .command('init', chalk.cyan('生成配置文件'), { executableFile: 'init' })
program
    .command('collect')
    .description(chalk.cyan('收集中文，并生成对应的语言文件'))
    .option('-f, --forceUpdate', '强制更新文件', false)
    .action((opt) => {
        collect(opt)
    })
    
program
    .command('replace', chalk.cyan('替换文件中的中文为多语言写法'), { executableFile: 'replace' })
program
    .command('buildExcel')
    .description(chalk.cyan('根据语言JSON，生成excel文件'))
    .option('-n, --fileName', '生成的excel文件名称', 'lan.xlsx')
    .option('-s, --sheetName', '生成的excel的sheet名称', 'lan')
    .action((opt) => {
        buildExcel(opt)
    })

program.parse(process.argv)