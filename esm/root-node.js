import { BlockNode } from './block-node.js'

export class RootNode extends BlockNode {
  type = 'Root';
  module = [];

  asModule(context) {
    const { module, parser, code } = this
    const { outputOptions: { modules } } = parser

    const fn = this.asFunction(context)

    return modules
      .replace(/[$]imports/g, module)
      .replace(/[$]function/g, fn)
  }

  toString(context) {
    return this.asFunction(context)
  }
}
