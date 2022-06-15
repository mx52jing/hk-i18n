import ora from "ora";
import chalk from "chalk";
import { parallelCallFn } from "./tool";
const translate = require('@vitalets/google-translate-api');
import type { ILanJSON } from './tool'

type ITranslateFn = (text: string, to: string) => Promise<string>
const spinner = ora();
const delay = (ms: number = 5000) => new Promise((resolve) => {
  setTimeout(() => resolve(TRANSLATE_TIMEOUT), ms)
})

export const freeTranslate = async (text: string, to: string) => {
  return await translate(text, {
    to,
    tld: 'cn',
    client: 'gtx'
  })
}

export const TRANSLATE_TIMEOUT = '__translate_timeout__';
export let timeoutKey = '';
export const translateText: ITranslateFn = async (text: string, to: string) => {
  const res = await Promise.race([
    delay(),
    freeTranslate(text, to)
  ]);
  if (res === TRANSLATE_TIMEOUT) {
    spinner.fail(chalk.red(`[${text}]翻译超时`));
    return;
  }
  return res.text;
}

// 最长可翻译的中文
export const CN_MAX_LEN = 5000;
// 最多可以有多少中文同时翻译
export const MAX_TRAN_LAN = 10;
/**
 * 并行翻译所有中文，默认最多同时翻译MAX_TRAN_LAN个
 * @param curLanData 当前JSON数据
 * @param newTranObj 中文JSON的 translation字段中的映射数据
 * @param keys 所有要翻译的中文的key
 * @param lan 要翻译成的语种
 * @param maxTranslateNum 最多同时翻译多少中文
 */
export const parallelTranslate = async (curLanData: ILanJSON, newTranObj: Record<string, string>, keys: Array<string>, lan: string, maxTranslateNum: number) => {
  try {
    const tasks = keys.map(key => {
      return () => new Promise((resolve, reject) => {
        const val = newTranObj[key];
        if(!val) {
          resolve(key);
          spinner.warn(`未找到key:[${chalk.red(key)}]对应的中文`);
          return;
        }
        if (val?.length > CN_MAX_LEN) {
          spinner.warn(`序号[${chalk.yellow(key)}]的文字长度过长，将跳过翻译，最大可翻译长度为[${chalk.yellow(CN_MAX_LEN)}]`);
          curLanData.translation[key] = val;
          resolve(key);
          return;
        }
        translateText(val, lan).then(text => {
          if(val.startsWith('\n')) {
            text = `\n${text}`
          }
          if(val.endsWith('\n')) {
            text = `${text}\n`
          }
          if(!text) {
            timeoutKey += !!timeoutKey ? `,${key}` : key;
          }
          curLanData.translation[key] = text;
          resolve(key);
        })
      })
    });
    await parallelCallFn(tasks, maxTranslateNum);
  } catch (error) {
   spinner.fail(chalk.red(`翻译接口报错=>${error}`)) 
  }
}