#! /usr/bin/env node
import { program } from 'commander';
import chalk from "chalk";

const pkg = require('../package.json')

program.version(pkg.version)
program
    .command('init', chalk.cyan('生成配置文件'), { executableFile: 'init' })
    .command('collect', chalk.cyan('收集中文，并生成对应的语言文件'), { executableFile: 'collect' })
    .command('replace', chalk.cyan('替换文件中的中文为多语言写法'), { executableFile: 'replace' })

program.parse(process.argv)