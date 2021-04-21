import { BlockNode } from './block-node.js'

export class ConditionNode extends BlockNode {
  type = 'Condition'

  constructor(parser, { test, alternate }) {
    super(parser)
    this.test = test
    this.alternate = alternate
  }

  toString(context) {
    const { test, parser } = this
    const { outputOptions: { if: If, else: Else = 'null' } } = parser

    const consequent = this.asExpression(context)
    const alternate = this.alternate
      ? this.alternate.asExpression(context)
      : Else

    return If
      .replace(/[$]test/g, test)
      .replace(/[$]consequent/g, consequent)
      .replace(/[$]alternate/g, alternate)
  }
}
