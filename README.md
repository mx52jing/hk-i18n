# hk-i18n

自动国际化

## 前提

项目中必须使用`i18next`来实现国际化

## 下载

```bash
# npm
npm i hk-i18n
# yarn
yarn add hk-i18n
```
## 查看使用帮助
```bash
npx hk-i18n
```
## 初始化

```bash
npx hk-i18n init
```
会在项目根目录下生成`i18n.config`，默认配置如下

```json
{
  "matchOpts": [
    "src/**/*.{js,ts,tsx,jsx}",
    { "ignore": ["**/node_modules/**"] }
  ],
  "localesDir": "./locales",
  "cnJsonFileName": "zh-CN.json",
  "translateLan": ["zh-TW"],
  "excelDir": "./excel"
}
```
- matchOpts

  匹配文件的选项，参考[glob](https://www.npmjs.com/package/glob)

- localesDir(string)
  要保存的多语言映射文件路径

- cnJsonFileName(string)
  要保存的中文JSON文件名称

- translateLan(Array\<string>)
  要将中文翻译成哪几种语言,参考[languages](https://github.com/vitalets/google-translate-api/blob/master/languages.js)

- excelDir(string)
  生成excel的目录

## 收集中文

- 匹配文件中的中文并生成中文JSON

```bash
npx hk-i18n collect
```

- 如果收集过后在项目代码中添加没有新的中文时，默认不会去重新生成JSON文件，如果想重新生成，可以在执行`collect`时使用强制更新

⚠️注意：谨慎使用该参数，因为生成的JSON的`key`是自增的数字，如果代码中中文已经被替换为`i18next.t('key')`的模式，使用强制更新可能使新生成的JSON文件的key和原来的key不一样

- 如果不想对某一段文字翻译，可以添加魔法注释`/*i18n-disable*/中文`，在收集中文时会忽略这个中文

## 翻译中文并生成对应的语言文件

```bash
npx hk-i18n translate
```
默认会将中文JSON中的文案全部翻译，也可以指定只翻译哪些中文，参数是`keys1, keys2, ...`，多个key以`逗号`分隔

## 替换中文

- 替换代码中的中文，替换后格式为`i18next.t('key' /*key代表的中文*/)`

```bash
npx hk-i18n replace
```

## 通过多语言文件生成`excel`文件

```bash
hk-i18n buildExcel
```
- 生成的`excle`默认名称为`lan.xlsx`
- 生成的`excle`默认`sheet`名称为`lan`
## 存在的问题和不足

- 目前判断是否去替换中文时，使用正则对文本code判断，如果匹配到的文件中有打包压缩后的代码，可能会卡死，记得排除这类文件
- 使用谷歌免费翻译接口，每天翻译超过一定次数当天调用接口会不成功，需要第二天调用
