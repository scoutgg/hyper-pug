import lexer from 'pug-lexer'
import parse from 'pug-parser'


import { Parser } from 'acorn'
import { BlockNode } from './block-node.js'
import { MixinNode } from './mixin-node.js'
import { RootNode } from './root-node.js'
import { EachNode } from './each-node.js'
import { ConditionNode } from './condition-node.js'

export { Parser }

const replace = {
  "'": '&#39;',
  '"': '&quot;'
}

function escapeAttr(text) {
  return text.replace(/['"]/g, c => replace[c])
}

const OUTPUT_OPTIONS = {
  if: '$test ? $consequent : $alternate',
  else: 'null',
  events: 'on$name',
  properties: '.$name',
  functions: 'function $name($args){$code\nreturn $child}',
  modules: '$imports\nexport default $function',
  mixins: '$mixin({$props}, $children)',
  bindings: 'oninput',
  each: `Object.entries($object).map(([$key, $value]) => {$code\n return $child})`
}

function applyDefaults(options) {
  return { ...OUTPUT_OPTIONS, ...options }
}

const EVENT = /^(?:[@(]|on)([\S]+?)[)]?$/
const PROPERTY = /^(?:[.\[])([\S]+?)[\]]?$/
export class HyperPug {
  constructor({ 
    source = '',
    tag = 'html',
    name = 'template',
    filename = `${name}.pug`,
    lexOptions = {},
    parseOptions = {},
    outputOptions = OUTPUT_OPTIONS,
    ast = parse(lexer(source, { filename, ...lexOptions }), {
      filename: filename,
      ...parseOptions,
    })
  }) {
    this.tag = tag
    this.name = name
    this.outputOptions = applyDefaults(outputOptions)
    this.pugAst = ast
    this.target = new RootNode(this)
    this.context = []
    this.buffer = ''
    this.visit(ast)
    this.target.quasis.push(this.buffer)
  }
  visit(ast) {
    const visitor = `visit${ast.type}`

    if(!this[visitor]) {
      throw new Error(`${ast.type} not implemented!`)
    }

    this[visitor](ast)
  }

  addExpression(expression, after = '') {
    this.target.quasis.push(this.buffer)
    this.target.expressions.push(expression)
    this.buffer = after
  }

  addBlock(node, block, pop = true) {
    if(!block) return

    this.target.expressions.push(node)
    this.target.quasis.push(this.buffer)
    this.buffer = ''

    this.context.push(this.target)

    this.target = node
    this.visitBlock(block)
    this.target.quasis.push(this.buffer)
    this.buffer = ''
    
    if(pop) {
      this.target = this.context.pop()
    }
  }

  visitDoctype(node) {
    this.buffer += `<!DOCTYPE ${node.val}>`
  }
  
  visitBlock(block) {
    for(const ast of block.nodes) {
      this.visit(ast)
    }
  }

  visitRawInclude(include) {
    const root = this.context[0] || this.target
    const { path } = include.file
    const id = this.includes || 1

    this.includes = id + 1
    const expression = `__include$${id}`

    root.module.unshift(`import ${expression} from ${JSON.stringify(path)}`)
    this.addExpression(expression)
  }

  getProp(prop) {
    const { properties: format } = this.outputOptions

    if(typeof format === 'function') {
      return format(prop)
    }

    return format.replace(/[$]name/g, prop)
  }

  getEvent(name) {
    const { events: format } = this.outputOptions

    if(typeof format === 'function') {
      return format(name)
    }
    return format.replace(/[$]name/g, name)
  }

  getBinding(name) {
    const { bindings: format } = this.outputOptions

    const event = this.getEvent(name)
    
    if(typeof postfix === 'function') {
      return format(event, name)
    }

    return format.replace(/[$]name/g, event)
  }

  normalizeAttributes(tag) {
    let match = null

    const { outputOptions } = this
    const { wrapEvents = true } = outputOptions

    for(const attr of tag.attrs) {
      const { val, name } = attr

      attr.originalName = name
      if(match = EVENT.exec(name)) {
        attr.val = wrapEvents ? `e => ${val}` : val
        attr.name = this.getEvent(match[1])
        attr.code = true
      } else if(match = PROPERTY.exec(name)) {
        let binding = EVENT.exec(match[1])

        attr.code = true

        if(binding) {
          attr.name = this.getProp(binding[1])

          const name = binding[1]
          const prop = val

          const expr = `${prop} = e.target.${name}`
          const event = this.getBinding(binding[1])
            
          tag.attrs.push({
            name: event,
            code: true,
            val: wrapEvents ? expr : `e => ${expr}`
          })
        } else {
          attr.name = this.getProp(match[1])
        }
      } else if(name[0] === ':') {
        const prop = name.slice(1)
        const expr = `${val} = e.target.${prop}`
        attr.code = true
        attr.name = this.getProp(prop)
      
        tag.attrs.push({
          code: true,
          name: this.getEvent('input'),
          val: wrapEvents ? expr : `e => ${expr}`
        })
      } else if(val[0] === '"' || val[0] === "'") {
        try {
          let value = JSON.parse(val.replace(/(^')|('$)/g, '"'))
          
          if(attr.mustEscape) {
            value = escapeAttr(value)
          } 

          attr.val = value
        } catch {
          attr.code = true
        }
      } else if(val != null) {
        attr.code = true
      }
    }

  }

  visitAttributes(tag) {
    this.normalizeAttributes(tag)

    for(const attr of tag.attrs) {
      this.buffer += ' ' + attr.name
      if(attr.val === true) continue
      this.buffer += '='
      if(attr.code) {
        this.addExpression(attr.val)
      } else {
        this.buffer += '"' + attr.val + '"'
      }
    }
  }

  visitText(text) {
    this.buffer += text.val
  }

  visitCode(code) {
    if(code.buffer) {
      this.addExpression(code.val)
    } else {
      this.target.code.push(code.val)
    }
  }

  visitTag(tag) {
    const { name } = tag

    this.buffer += `<${name}`

    if(tag.attrs && tag.attrs.length) {
      this.visitAttributes(tag)
    }

    if(tag.selfClosing) {
      this.buffer += '/>'
    } else {
      this.buffer += '>'
      if(tag.block) {
        this.visitBlock(tag.block)
      }
      this.buffer += `</${name}>`
    }
  }

  visitEach(each) {
    this.addBlock(new EachNode(this, each), each.block)
  }

  visitConditional(condition) {
    const { test } = condition

    const alternate = condition.alternate ? new BlockNode(this) : null
    const consequent = new ConditionNode(this, { test, alternate })

    this.addBlock(consequent, condition.consequent, false)
    
    if(alternate) {
      this.target = alternate
      this.visitBlock(condition.alternate)
      this.target.quasis.push(this.buffer)
      this.buffer = ''
    }

    this.target = this.context.pop()
  }

  visitMixinDefinition(mixin) {
    const root = this.context[0] || this.target
    const node = new MixinNode(this, mixin)

    const { target, buffer } = this

    this.target = node
    this.buffer = ''

    this.visitBlock(mixin.block)

    this.target.quasis.push(this.buffer)

    root.code.push(node)

    this.target = target
    this.buffer = buffer
  }

  visitMixin(mixin) {
    if(!mixin.call) {
      return this.visitMixinDefinition(mixin)
    }

    this.normalizeAttributes(mixin)

    const { name, attrs } = mixin    

    if(mixin.block) {
      this.addBlock(new MixinNode(this, { name, attrs }), mixin.block)
    } else {
      this.addExpression(new MixinNode(this, { name, attrs }))
    }
  }
}