import React from 'react'
import SimpleMarkdown from 'simple-markdown'
import { LabeledLink } from './LabeledLink'
const { openExternal } = window.electron_functions

var ignoreCapture = function() {
  return {}
}

function assign(rule: any, order: any, object = {}) {
  return Object.assign({}, rule, { order }, object)
}

// function ignoreScope (rule) {
//   return Object.assign(rule, {
//     match: anyScopeRegex(rule.match.regex)
//   })
// }

// function ignoreScopeAssign (rule, order, object = {}) {
//   return ignoreScope(assign(rule, order, object))
// }

export const previewRules: SimpleMarkdown.ParserRules = {
  Array: SimpleMarkdown.defaultRules.Array,
  // strong: ignoreScopeAssign(defaultRules.strong, 1), // bold
  // em: ignoreScopeAssign(defaultRules.em, 1), // italics
  // ubold: assign(ignoreScope(defaultRules.u), 2, { react: defaultRules.strong.react }),
  // del: ignoreScopeAssign(defaultRules.del, 3),
  // inlineCode: ignoreScopeAssign(defaultRules.inlineCode, 12),
  text: assign(SimpleMarkdown.defaultRules.text, 100),
}
export const rules: SimpleMarkdown.ParserRules = Object.assign(
  {
    // new mailto (open chat in dc?)
    // blockQuote ? (requires css; could be used for replies)
    // mentions? (this component requires somekind of access to the chat memberlist)
    // codeBlock: assign(defaultRules.codeBlock, 11, {
    //   react: function (node, output, state) {
    //     var className = node.lang
    //       ? 'markdown-code markdown-code-' + node.lang
    //       : undefined
    //     // code with syntax highlighting (?)
    //     return <code className={className} key={state.key}>
    //       {node.content}
    //     </code>
    //   }
    // }),
    // fence: assign(defaultRules.fence, 11, {
    //   match: blockRegex(/^ *(`{3,}|~{3,})(\S+)? *\n?([\s\S]+?)\s*\1\n*/)
    // }), // uses style of codeBlock
    labeled_link: {
      order: 18,
      match: SimpleMarkdown.anyScopeRegex(
        /^\[([^\]]*)\]\((https?:\/\/[^\s<]+[^<>.,:;"')\]{3,1000}\s])\)/
      ),
      parse: function(
        capture: RegExpMatchArray,
        recurseParse: any,
        state: any
      ) {
        var link = {
          label: capture[1],
          target: capture[2],
        }
        return link
      },
      react: function(node: any, output: any, state: any) {
        return (
          <LabeledLink
            key={state.key}
            target={node.target}
            label={node.label}
          />
        )
      },
    },
    normal_link: {
      order: 18,
      match: SimpleMarkdown.anyScopeRegex(/^(https?:\/\/[^\s<]+[^<>.,:;"')\]\s])/),
      parse: function(capture: any[], recurseParse: any, state: any) {
        return { content: capture[1] }
      },
      react: function(node: any, output: any, state: any) {
        const onClick = (ev: any) => {
          ev.preventDefault()
          openExternal(node.content)
        }
        return (
          <a href={node.content} key={state.key} onClick={onClick}>
            {node.content}
          </a>
        )
      },
    },
    newlinePlus: {
      order: 19,
      match: SimpleMarkdown.blockRegex(/^(?:\n *){2,}\n/),
      parse: ignoreCapture,
      react: function(node: any, output: any, state: any) {
        return <div key={state.key} className='double-line-break' />
      },
    },
    newline: {
      order: 20,
      match: SimpleMarkdown.blockRegex(/^(?:\n *)\n/),
      parse: ignoreCapture,
      react: function(node: any, output: any, state: any) {
        return <div key={state.key} className='line-break' />
      },
    },
  },
  previewRules
)
