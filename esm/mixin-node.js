import { BlockNode } from './block-node.js'

export class Props {
  constructor(attrs) {
    this.attrs = attrs
  }

  toString() {
    return this.attrs
      .map(({ name, val }) => {
        return [name, val].join(':')
      })
      .join(',')
  }
}
export class Attrs {
  constructor(attrs) {
    this.attrs = attrs
  }

  toString() {
    const attrs = this.attrs.map(({ name, val, code }) => {
      return [name, code ? `$\{${val}}` : val].join('=')
    })
    return `${attrs.join(' ')}`
  }
}

export class MixinNode extends BlockNode {
  type = 'Mixin';

  constructor(parser, { name, attrs, block, args }) {
    super(parser)
    this.name = name
    this.attrs = attrs
    this.block = block
    this.args = args
  }

  toString(context) {
    const { name, attrs, parser, args } = this

    if(this.block) {
      return this.asFunction({ arguments: args })
    }

    const { outputOptions: { mixins } } = parser

    if (typeof mixins === 'function') {
      return mixins({
        name: name,
        attrs: new Attrs(attrs),
        props: new Props(attrs),
        children: this
      })
    }

    const code = mixins
      .replace(/[$]mixin/g, name)
      .replace(/[$]props/g, () => {
        return new Props(attrs)
      })
      .replace(/[$]attrs/g, () => {
        return new Attrs(attrs)
      })
      .replace(/[$]children/g, () => {
        return this.asExpression(context)
      })
      .replace(/[$]content/g, () => {
        return this.asHtml(context)
      })
    
    return code
  }
}
