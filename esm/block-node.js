import isExpression from 'is-expression'

const PARSER = Symbol('parser')

export class BlockNode {
  type = 'Block';

  code = [];
  quasis = [];
  expressions = [];

  constructor(parser, { name = parser.name } = {}) {
    this[PARSER] = parser
    this.name = name
  }

  get parser() {
    return this[PARSER]
  }

  asFunction(context = {}) {
    const { name, code, parser } = this
    const { outputOptions: { functions } } = parser

    const { arguments: args = [], ...subcontext } = context

    const child = this.asTaggedTemplate(subcontext)

    return functions
      .replace(/[$]name/g, name)
      .replace(/[$]args/g, args)
      .replace(/[$]code/g, code.join(';'))
      .replace(/[$]child/, child)
  }

  asExpression(context) {
    const { code } = this
    const tag = this.asTaggedTemplate(context)

    if (!code.length) {
      return tag
    }

    const expressions = code.every(isExpression)

    if (expressions) {
      return `(${code.concat(tag)})`
    }

    return `(()=>{${code.join(';')};return ${tag}})()`
  }

  asTaggedTemplate(context) {
    return [this.parser.tag, '`', this.asHtml(context), '`'].join('')
  }

  asHtml(context) {
    let result = ''

    for (let index = 0; index < this.quasis.length; index++) {
      const quasis = this.quasis[index]
      const expression = this.expressions[index]

      result += quasis

      if (expression !== void 0) {
        if (typeof expression === 'object' && expression !== null) {
          result += '${' + expression.toString(context) + '}'
        } else {
          result += '${' + expression + '}'
        }
      }
    }
    return result
  }

  toString(context) {
    return this.asExpression(context)
  }
}
