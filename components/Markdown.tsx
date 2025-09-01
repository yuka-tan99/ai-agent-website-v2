'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Extend props so TS knows about `inline`
type CodeProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement>,
  HTMLElement
> & {
  inline?: boolean
  children?: React.ReactNode
}

type Props = { children: string }

export default function Markdown({ children }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      allowedElements={[
        'p', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'br', 'code', 'pre', 'blockquote', 'hr'
      ]}
      components={{
        p: (props) => <p className="mb-2 leading-relaxed" {...props} />,
        strong: (props) => <strong className="font-semibold" {...props} />,
        ul: (props) => <ul className="list-disc pl-6 space-y-1 mb-2" {...props} />,
        ol: (props) => <ol className="list-decimal pl-6 space-y-1 mb-2" {...props} />,
        li: (props) => <li {...props} />,
        a: (props) => (
          <a {...props} className="underline" target="_blank" rel="noopener noreferrer" />
        ),
        code: ({ inline, children, ...props }: CodeProps) =>
          inline ? (
            <code className="px-1 py-0.5 rounded bg-gray-100" {...props}>
              {children}
            </code>
          ) : (
            <pre className="p-3 rounded bg-gray-100 overflow-x-auto">
              <code {...props}>{children}</code>
            </pre>
          ),
      }}
    >
      {children}
    </ReactMarkdown>
  )
}