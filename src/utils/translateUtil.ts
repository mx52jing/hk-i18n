import ora from "ora";
import chalk from "chalk";
import { parallelCallFn } from "./tool";
const translate = require('@vitalets/google-translate-api');
import type { ILanJSON } from './tool'

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
  if (res === 'timeout') {
    spinner.fail(chalk.red(`[${text}]翻译超时`));
    return;
  }
  return res.text;
}

// 最长可翻译的中文
export const CN_MAX_LEN = 5000;
// 最多可以有多少中文同时翻译
export const MAX_TRAN_LAN = 50;
// 并行翻译所有中文，最多同时翻译MAX_TRAN_LAN个
export const parallelTranslate = async (curLanData: ILanJSON, newTranObj: Record<string, string>, keys: Array<string>, lan: string) => {
  const tasks = keys.map(key => {
    return () => new Promise((resolve, reject) => {
      const val = newTranObj[key];
      if (val?.length > CN_MAX_LEN) {
        spinner.warn(`序号[${chalk.yellow(key)}]的文字长度过长，将跳过翻译，最大可翻译长度为[${chalk.yellow(CN_MAX_LEN)}]`);
        curLanData.translation[key] = val;
        resolve(key);
        return;
      }
      translateText(val, lan).then(text => {
        curLanData.translation[key] = text;
        resolve(key);
      })
    })
  });
  await parallelCallFn(tasks, MAX_TRAN_LAN)
}