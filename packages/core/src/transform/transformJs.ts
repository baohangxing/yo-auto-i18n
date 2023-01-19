import { createRequire } from 'module'
import type { NodePath } from '@babel/traverse'
import type {
  CallExpression,
  Comment,
  Expression,
  ImportDeclaration,
  JSXAttribute,
  JSXText,
  MemberExpression,
  ObjectExpression,
  ObjectProperty,
  Program,
  StringLiteral,
  TemplateLiteral,
} from '@babel/types'
import type { GeneratorResult } from '@babel/generator'
import template from '@babel/template'
import { isEmpty, isObject } from 'lodash-es'
import t from '@babel/types'
import type * as traverseType from '@babel/traverse/index'
import type * as generatorType from '@babel/generator/index'
import type { transformOptions } from '../types'
import { escapeQuotes, includeChinese } from '../utils/help'
import { IGNORE_REMARK } from '../config/constants'
import Collector from './collector'

const require = createRequire(import.meta.url)
// see https://github.com/babel/babel/issues/13855
const traverse: typeof traverseType.default = require('@babel/traverse').default
const babelGenerator: typeof generatorType.default = require('@babel/generator').default

interface TemplateParams {
  [k: string]:
  | string
  | {
    isAstNode: true
    value: Expression
  }
}

function getObjectExpression(obj: TemplateParams): ObjectExpression {
  const ObjectPropertyArr: ObjectProperty[] = []
  Object.keys(obj).forEach((k) => {
    const tempValue = obj[k]
    let newValue: Expression
    if (isObject(tempValue))
      newValue = tempValue.value
    else
      newValue = t.identifier(tempValue)

    ObjectPropertyArr.push(t.objectProperty(t.identifier(k), newValue))
  })
  const ast = t.objectExpression(ObjectPropertyArr)
  return ast
}

/**
 * 判断节点是否是vue组件props属性的默认值，例如：
 * ```
 * props: {
    title: {
      default: '标题'
    }
  }
 * ```
 */
function isPropDefaultStringLiteralNode(path: NodePath<StringLiteral>): boolean {
  const objWithProps = path.parentPath?.parentPath?.parentPath?.parentPath?.parent
  const rootNode
    = path.parentPath?.parentPath?.parentPath?.parentPath?.parentPath?.parentPath?.parent
  let isMeetProp = false
  let isMeetKey = false
  let isMeetContainer = false
  // 属性是否包含在props结构里
  if (
    objWithProps
    && objWithProps.type === 'ObjectProperty'
    && objWithProps.key.type === 'Identifier'
    && objWithProps.key.name === 'props'
  )
    isMeetProp = true

  // 对应key是否是default
  if (
    path.parent
    && path.parent.type === 'ObjectProperty'
    && path.parent.key.type === 'Identifier'
    && path.parent.key.name === 'default'
  )
    isMeetKey = true

  // 遍历到指定层数后是否是导出声明
  if (rootNode && rootNode.type === 'ExportDefaultDeclaration')
    isMeetContainer = true

  return isMeetProp && isMeetKey && isMeetContainer
}

function getStringLiteral(value: string): StringLiteral {
  return Object.assign(t.stringLiteral(value), {
    extra: {
      raw: `'${value}'`,
      rawValue: value,
    },
  })
}

function transformJs(code: string, options: transformOptions): GeneratorResult {
  const rule = options.rule
  let hasImportI18n = false // 文件是否导入过i18n
  let hasTransformed = false // 文件里是否存在中文转换，有的话才有必要导入i18n

  function getCallExpression(identifier: string, quote = '\''): string {
    const { transCaller, transIdentifier } = rule
    const transCallerName = transCaller ? `${transCaller}.` : ''
    const expression = `${transCallerName}${transIdentifier}(${quote}${identifier}${quote})`
    return expression
  }

  function getReplaceValue(value: string, params?: TemplateParams) {
    value = escapeQuotes(value)
    const { transCaller, transIdentifier } = rule
    // 表达式结构 obj.fn('xx',{xx:xx})
    let expression: string
    // i18n标记有参数的情况
    if (params) {
      const keyLiteral = getStringLiteral(Collector.getKey(value))
      if (transCaller) {
        return t.callExpression(
          t.memberExpression(t.identifier(transCaller), t.identifier(transIdentifier)),
          [keyLiteral, getObjectExpression(params)],
        )
      }
      else {
        return t.callExpression(t.identifier(transIdentifier), [
          keyLiteral,
          getObjectExpression(params),
        ])
      }
    }
    else {
      // i18n标记没参数的情况
      expression = getCallExpression(Collector.getKey(value))
      return template.expression(expression)()
    }
  }

  function transformAST(code: string, options: transformOptions) {
    function getTraverseOptions() {
      return {
        enter(path: NodePath) {
          const leadingComments = path.node.leadingComments
          if (leadingComments) {
            // 是否跳过翻译
            let isSkipTransform = false
            leadingComments.every((comment: Comment) => {
              if (comment.value.includes(IGNORE_REMARK)) {
                isSkipTransform = true
                return false
              }
              return true
            })
            if (isSkipTransform)
              path.skip()
          }
        },

        StringLiteral(path: NodePath<StringLiteral>) {
          if (includeChinese(path.node.value) && options.isJsInVue && isPropDefaultStringLiteralNode(path)) {
            const expression = `() => ${getCallExpression(path.node.value)}`
            hasTransformed = true
            Collector.add(path.node.value)
            path.replaceWith(template.expression(expression)())
            path.skip()
            return
          }

          if (includeChinese(path.node.value)) {
            hasTransformed = true
            Collector.add(path.node.value)
            path.replaceWith(getReplaceValue(path.node.value))
          }
          path.skip()
        },

        TemplateLiteral(path: NodePath<TemplateLiteral>) {
          const { node } = path
          const templateMembers = [...node.quasis, ...node.expressions]
          templateMembers.sort((a, b) => (a.start as number) - (b.start as number))

          const shouldReplace = node.quasis.some(node => includeChinese(node.value.raw))

          if (shouldReplace) {
            let value = ''
            let slotIndex = 1
            const params: TemplateParams = {}
            templateMembers.forEach((node) => {
              if (node.type === 'Identifier') {
                value += `{${node.name}}`
                params[node.name] = node.name
              }
              else if (node.type === 'TemplateElement') {
                value += node.value.raw.replace(/[\r\n]/g, '') // 用raw防止字符串中出现 /n
              }
              else if (node.type === 'MemberExpression') {
                const key = `slot${slotIndex++}`
                value += `{${key}}`
                params[key] = {
                  isAstNode: true,
                  value: node as MemberExpression,
                }
              }
              else {
                // 处理${}内容为表达式的情况。例如`测试${a + b}`，把 a+b 这个语法树作为params的值, 并自定义params的键为slot加数字的形式
                const key = `slot${slotIndex++}`
                value += `{${key}}`
                const expression = babelGenerator(node).code
                const tempAst = transformAST(expression, options) as any
                const expressionAst = tempAst.program.body[0].expression
                params[key] = {
                  isAstNode: true,
                  value: expressionAst,
                }
              }
            })
            hasTransformed = true
            Collector.add(value)
            const slotParams = isEmpty(params) ? undefined : params
            path.replaceWith(getReplaceValue(value, slotParams))
          }
        },

        JSXText(path: NodePath<JSXText>) {
          if (includeChinese(path.node.value)) {
            hasTransformed = true
            Collector.add(path.node.value.trim())
            path.replaceWith(t.jSXExpressionContainer(getReplaceValue(path.node.value.trim())))
          }
          path.skip()
        },

        JSXAttribute(path: NodePath<JSXAttribute>) {
          const node = path.node as NodePath<JSXAttribute>['node']
          const valueType = node.value?.type
          if (valueType === 'StringLiteral' && node.value && includeChinese(node.value.value)) {
            // TODO
            const jsxIdentifier = t.jsxIdentifier(node.name.name as string)
            const jsxContainer = t.jSXExpressionContainer(getReplaceValue(node.value.value))
            hasTransformed = true
            Collector.add(node.value.value)
            path.replaceWith(t.jsxAttribute(jsxIdentifier, jsxContainer))
            path.skip()
          }
        },

        CallExpression(path: NodePath<CallExpression>) {
          const { node } = path
          const { transCaller, transIdentifier } = rule
          const callee = node.callee

          // 无调用对象的情况，例如$t('xx')
          if (callee.type === 'Identifier' && callee.name === transIdentifier) {
            path.skip()
            return
          }

          // 有调用对象的情况，例如this.$t('xx')、i18n.$t('xx')
          if (callee.type === 'MemberExpression') {
            if (callee.property && callee.property.type === 'Identifier') {
              if (callee.property.name === transIdentifier) {
                // 处理形如i18n.$t('xx)的情况
                if (callee.object.type === 'Identifier' && callee.object.name === transCaller) {
                  path.skip()
                  return
                }
                // 处理形如this.$t('xx')的情况
                if (callee.object.type === 'ThisExpression' && transCaller === 'this')
                  path.skip()
              }
            }
          }
        },

        ImportDeclaration(path: NodePath<ImportDeclaration>) {
          const { importDeclaration } = rule
          const res = importDeclaration.match(/from ["'](.*)["']/)
          const packageName = res ? res[1] : ''

          if (path.node.source.value === packageName)
            hasImportI18n = true

          if (!hasImportI18n && hasTransformed) {
            const importAst = template.statements(importDeclaration)()
            const program = path.parent as Program
            importAst.forEach((statement) => {
              program.body.unshift(statement)
            })
            hasImportI18n = true
          }
        },
      }
    }

    const ast = options.parse(code)
    traverse(ast, getTraverseOptions())
    return ast
  }

  const ast = transformAST(code, options)

  const result = (!ast ? code : babelGenerator(ast)) as GeneratorResult

  if (!hasImportI18n && hasTransformed) {
    const { importDeclaration } = rule
    result.code = `${importDeclaration}\n${result.code}`
  }
  return result
}

export default transformJs
