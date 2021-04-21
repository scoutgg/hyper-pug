// import htm from 'htm'
import { html, render } from 'uhtml'
import { HyperPug } from '../esm/index.js'


function h(tagName, properties, ...children) {
  return { tagName, properties, children: children.flat(Infinity) }
}

// const html = htm.bind(h)

const posts = globalThis.posts = [
  {
    title: 'Hello world',
    slug: 'hello-world',
    content: 'This is some content',
    author: 'fireneslo'
  }
]

const cache = new WeakMap

function pug(statics, ...values) {
  const self = this || globalThis

  if(cache.has(statics)) {
    return cache.get(statics).apply(self, values)
  }
  
  const args = Array.from(values, (_, i) =>`_${i}`)
  const source = String.raw(statics, ...args)
  const { target } = new HyperPug({
    source,
    outputOptions: {
      mixins: 'html `<${$mixin} $attrs>$content<//>`'
    }
  })
  const code = target.asFunction({arguments: `${args}` })

  const template = Function(['html'], 'return ' + code)(html)

  cache.set(statics, template)

  console.log(template)

  return template.apply(self, values)
}

;(function apply(iteration = 0) {
  const source = pug`
- let index = ${iteration}
- let render = ${apply}
mixin Author({ name='' }, children)
  i= name
  = children

main
  h1 count #{index}
  
  button(@click=render(++index)) Increment

  input(:value=this.contents, @blur=render())

  p= this.contents

  if index % 2
    - var cool = 'neat'
    b Odd
  else 
    b: i Even
  each post in ${posts}
    - let { title, author, content, slug } = post
    article.post
      a(href="/posts/"+slug)
        h2= title
      p= content
      +Author(name=author)
        h1 extra

`
  // console.log(source)
  console.log(render(document.body, source))  
}())

