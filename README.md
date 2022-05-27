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

## 收集中文和生成其他语言文件

- 匹配文件中的中文并生成中文JSON
- 根据中文JSON和`translateLan`配置，生成对应的其他多语言JDON文件，文件名称就是`translateLan`配置的名称

```bash
npx hk-i18n collect
```

- 如果收集过后在代码中添加没有新的中文时，默认不会去重新生成JSON文件，如果想重新生成，添加`-f`参数，会生成新的语言文件和对应的其他语言文件。

⚠️注意：谨慎使用该参数，因为生成的JSON的`key`是自增的数字，如果代码中中文已经被替换为`i18next.t('key')`的模式，使用`-f`参数可能使新生成的JSON文件的key和原来的key不一样

```bash
npx hk-i18n collect -f
```

- 如果不想对某一段文字翻译，可以添加魔法注释`/*i18n-disable*/中文`，在收集中文时会忽略这个中文



## 替换中文

- 替换代码中的中文，替换后格式为`i18next.t('key' /*key代表的中文*/)`

```bash
npx hk-i18n replace
```

## 通过多语言文件生成`excel`文件

```bash
hk-i18n buildExcel
```
- 生成的`excle`默认名称为`lan.excel`,可以通过`-n`修改生成的`excel`文件名
- 生成的`excle`默认`sheet`名称为`lan`,可以通过`-s`修改生成的`sheet`名称

## 问题

- 目前判断是否去替换中文时，使用正则对文本code判断，如果匹配到的文件中有打包压缩后的代码，可能会卡死，记得排除这类文件
