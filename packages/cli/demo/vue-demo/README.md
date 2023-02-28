# vue-demo

## Project setup

```
pnpm run install
```

### Compiles and hot-reloads for development

```
pnpm run serve
```

### Compiles and minifies for production

```
pnpm run build
```

### Lints and fixes files

```
pnpm run lint
```

### Customize configuration

See [Configuration Reference](https://cli.vuejs.org/config/).

## auto-i18n 使用示例

### init

详细可见[init 文档](https://github.com/baohangxing/auto-i18n#init)

删除 根目录下的 `auto.config.cjs` 文件

运行

```
pnpm run auto:init
```

### trans

详细可见[trans 文档](https://github.com/baohangxing/auto-i18n#trans)

运行

```
pnpm run auto:trans-modify
```

### check

详细可见[check 文档](https://github.com/baohangxing/auto-i18n#check)

运行

```
pnpm run auto:check
```

### genlsx

详细可见[genlsx 文档](https://github.com/baohangxing/auto-i18n#genlsx)

运行

```
pnpm run auto:genlsx
```

### update

详细可见[update 文档](https://github.com/baohangxing/auto-i18n#update)

删除或者添加 `src/lang/locales/cN.json` 中的一个语言字段

运行

```
pnpm run auto:update
```

或者编辑 `1.xlsx`下的多语言

运行

```
pnpm run auto:update2
```