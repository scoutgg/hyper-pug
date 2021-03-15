import lexer from 'pug-lexer'
import parse from 'pug-parser'

const UNQUOTE = /((^')|('$))/g

function unquote(string) {
  return string.replace(UNQUOTE, '"')
}

function $(code) {
  return `\${${code}}`
}

const EVENT_FORMATS = {
  on(event) {
    return `on${event.toLowerCase()}`
  },
  onUpper(event) {
    return `on${upperFirst(event)}`
  },
  at(event) {
    return `@${event}`
  },
  parans(event) {
    return `(${event})`
  }
}

const PROPERTY_FORMATS = {
  dot(property) {
    return `.${property}`
  },
  plain(property) {
    return property
  },
  colon(property) {
    return `:${property}`
  },
  bracket(property) {
    return `[${property}]`
  }
}

function transformers({ events, properties, each }) {
  if(typeof events !== 'function') {
    events = EVENT_FORMATS[events] || EVENT_FORMATS.on
  }
  if(properties !== 'functions') {
    properties = PROPERTY_FORMATS[properties] || PROPERTY_FORMATS.dot
  }

  return { events, properties, each }
}

export class HyperPug {
  constructor({ 
    source = '',
    tag = 'html',
    filename = 'template.pug',
    lexOptions = {},
    inputOptions = {
      events: /^(?:(?:@|on)(.*))|[(]([^)]+)[)]$/,
      properties: /^(?:\.(.*))|\[([^\]]+)\]$/,
    },
    outputOptions = {
      events: 'on',
      properties: 'dot',
      each(block, object, args) {
        return `Array.from(${object}, (${args}) => ${block})`
      }
    },
    parseOptions = {},
    ast = parse(lexer(source, { filename, ...lexOptions }), {
      filename: filename,
      ...parseOptions,
    })
  }) {
    this.tag = tag
    this.pugAst = ast
    this.inputOptions = inputOptions
    this.transform = transformers(outputOptions)
    this.blockStart = 0
    this.context = []
    this.result = [tag, '`']
    this.visit(ast)
    this.result.push('`')
    this.code = this.result.join('')
  }
  visit(ast) {
    const visitor = `visit${ast.type}`

    if(!this[visitor]) {
      throw new Error(`${ast.type} not implemented!`)
    }

    this[visitor](ast)
  }

  visitDoctype(node) {
    this.result.push(`<!DOCTYPE ${node.val}>`)
  }
  
  visitBlock(block) {
    for(const ast of block.nodes) {
      this.visit(ast)
    }
  }

  isEvent(event) {
    return this.inputOptions.events.test(event)
  }

  isProperty(event) {
    return this.inputOptions.properties.test(event)
  }

  visitEvent(attr, val, mustEscape) {
    const match = this.inputOptions.events.exec(attr)
    const event = match[1] || match[2]
    const name = this.transform.events(event)

    this.result.push(` ${name}=${$(`e => ${val}`)}`)
  }

  visitProperty(attr, val, mustEscape) {
    const match = this.inputOptions.properties.exec(attr)
    const prop = match[1] || match[2]
    const name = this.transform.properties(prop)

    this.result.push(` ${name}=${$(val)}`)
  }

  visitAttributes(tag) {
    for(const { name, val, mustEscape } of tag.attrs) {
      if(this.isEvent(name)) {
        this.visitEvent(name, val, mustEscape)
      } else if(this.isProperty(name)) {
        this.visitProperty(name, val, mustEscape)
      } else if(val === true) {
        this.result.push(` ${name}`)
      } else if(val !== false) {
        this.result.push(` ${name}=${mustEscape  ? $(val) : unquote(val)}`)
      }
    }
  }

  visitTag(tag) {
    this.result.push(`<${tag.name}`)

    this.visitAttributes(tag)

    if(tag.selfClosing) {
      this.result.push('/>')
    } else {
      this.result.push('>')
    }

    this.visit(tag.block)

    if(!tag.selfClosing) {
      this.result.push(`</${tag.name}>`)
    }
  }

  visitText(text) {
    this.result.push(text.val)
  }
  
  visitCode(code) {
    if(code.buffer) {
      this.result.push($(code.val))
    } else {
      if(!this.isBlock) {
        this.result.splice(this.blockStart, 0, 'return ')
        this.isBlock = true
      }
      this.result.splice(this.blockStart, 0, `${code.val};`)
      this.blockStart += 1
    }
  }

  visitEach(each) {
    const { result } = this
    
    this.result = [this.tag, '`']

    this.isBlock = false
    this.blockStart = 0

    this.visit(each.block)

    this.result.push('`')

    let block = this.result.join('')

    if(this.isBlock) block = `{${block}}`

    const args = [ each.val ]
    if(each.key) args.push(each.key)
    const code = this.transform.each(block, each.obj, args)
    this.result = result
    this.result.push($(code))
  }
}