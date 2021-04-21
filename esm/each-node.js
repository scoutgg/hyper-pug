import { BlockNode } from './block-node.js'

export class EachNode extends BlockNode {
  type = 'Each';

  constructor(parser, { obj, val, key }) {
    super(parser)
    this.object = obj
    this.value = val
    this.key = key
  }


  toString(context) {
    const { code, object, value, key } = this

    const args = [value, key].filter(Boolean)

    const { parser } = this
    const { outputOptions: { each } } = parser

    const child = this.asTaggedTemplate(context)

    return each
      .replace(/[$]key/g, key || '_')
      .replace(/[$]value/g, value)
      .replace(/[$]args/g, args)
      .replace(/[$]code/g, code.join(';'))
      .replace(/[$]object/g, object)
      .replace(/[$]child/g, child)
  }
}
