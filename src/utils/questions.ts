import chalk from "chalk";
// 收集的选项
export const collectQuestions = [
  {
    type: 'confirm',
    name: 'forceUpdate',
    message: chalk.cyan('是否启用强制更新'),
    default: false
  }
]
// 翻译指定的中文
export const translateQuestions = [
  {
    type: 'confirm',
    name: 'forceUpdate',
    message: chalk.cyan('是否启用强制更新，这样会重新翻译所有的中文'),
    default: false
  },
  {
    type: 'input',
    name: 'keys',
    message: chalk.cyan('请输入需要翻译的中文keys'),
    default: []
  }
]

// 生成excel选项
export const genExcelQuestions = [
  {
    type: 'input',
    name: 'fileName',
    message: chalk.cyan('请输入要生成的excel文件名称'),
    default: 'lan'
  },
  {
    type: 'input',
    name: 'sheetName',
    message: chalk.cyan('请输入要生成的excel的sheet名称'),
    default: 'lan'
  }
]
