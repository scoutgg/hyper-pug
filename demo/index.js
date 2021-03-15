import { html, render } from 'uhtml'
import { HyperPug } from '../esm/index.js'

// import htm from 'htm'

// function h(tagName, attributes, children) {
//   const element = document.createElement(tagName)
//   for(const [ attr, val ] of Object.entries(attributes || {})) {
//     element.setAttribute(attr, val)
//   }

//   if(Array.isArray(children)) {
//     for(const child of children) {
//       element.append(child)
//     }
//   } else {
//     element.append(children)
//   }


//   return element
// }

// const html = htm.bind(h)

function pug(strings, ...args) {
  const source = String.raw(strings, ...args)
  const { code } = new HyperPug({
    source: source,
    outputOptions: {
      each(block, object, args) {
        return `Object.entries(${object}).map(([${args.reverse()}]) => ${block})`
      }
    }
  })

  console.log(code)

  let create = null

  return function context(context) {
    if(!create) {
      create = Function(['html',`{${Object.keys(context)}}`], `return ${code}`)
    }
    
    return create(html, context)
  }
}


const template = pug`
static hello
h1#identity.class-name(attr=value+'stuff', flag)
  | Hello
ul((click)=console.log(e), [model]={"neat": "stuff"})
  each item, index in thing
    - var neat = item.thing
    li(
      data-index=index,
      .item=item,
      @click=console.log(e.target.item)
    )= neat
`

setTimeout(loop)

let value = 0
let thing = []

let range = null

function loop(params) {
  const nodes = template({
    value: value++,
    thing: thing = thing.concat([ { thing: 'neat' } ])
  })

  render(document.body, nodes)

  // let start = nodes[0]
  // let end = nodes[nodes.length - 1]

  // if(range) {
  //   range.deleteContents()
  // }

  // for(const node of nodes) {
  //   document.body.append(node)
  // }

  // range = document.createRange()
  // range.setStartBefore(start)
  // range.setEndAfter(end)

  return setTimeout(loop, 1000)
}

