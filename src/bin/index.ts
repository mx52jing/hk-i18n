#!/usr/bin/env node
import { program } from 'commander';
import chalk from "chalk";

const pkg = require('../package.json')

program.version(pkg.version)
program
    .command('init', chalk.cyan('生成配置文件'), { executableFile: 'init' })
    .command('collect', chalk.cyan('收集中文，生成中文JSON文件'), { executableFile: 'collect' })
    .command('translate', chalk.cyan('翻译指定key所对应的中文/翻译全部中文'), { executableFile: 'translate' })
    .command('replace', chalk.cyan('替换文件中的中文为多语言写法'), { executableFile: 'replace' })
    .command('buildExcel', chalk.cyan('根据语言JSON，生成excel文件'), { executableFile: 'buildExcel' })

program.parse(process.argv)