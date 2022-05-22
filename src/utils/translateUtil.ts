import ora from "ora";
import chalk from "chalk";
const translate = require('@vitalets/google-translate-api');

type ITranslateFn = (text: string, to: string) => Promise<string>
const spinner = ora();
const delay = (ms: number = 5000) => new Promise((resolve) => {
  setTimeout(_ => resolve('timeout'), ms)
})

export const freeTranslate = async (text: string, to: string) => {
  return await translate(text, {
    to,
    tld: 'cn',
    client: 'gtx'
  })
}

export const translateText: ITranslateFn = async (text: string, to: string) => {
  const res = await Promise.race([
    delay(),
    freeTranslate(text, to)
  ]);
  if(res === 'timeout') {
    spinner.fail(chalk.red(`[${text}]翻译超时`));
    return;
  }
  return res.text;
}