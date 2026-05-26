import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        p: ({ children }) => <p className="mb-3 leading-7 text-sm text-foreground/90">{children}</p>,
        ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 text-sm">{children}</ul>,
        ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm">{children}</ol>,
        li: ({ children }) => <li className="leading-6">{children}</li>,
        h1: ({ children }) => <h1 className="mb-3 text-xl font-semibold">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-2 text-lg font-semibold">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-2 text-base font-semibold">{children}</h3>,
        code: ({ inline, className, children, ...props }) =>
          inline ? (
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground" {...props}>
              {children}
            </code>
          ) : (
            <code className={`block overflow-x-auto rounded-lg border border-border/60 bg-muted p-4 font-mono text-sm ${className ?? ""}`} {...props}>
              {children}
            </code>
          ),
        pre: ({ children }) => <pre className="mb-4 overflow-x-auto rounded-lg border border-border/60 bg-muted p-0">{children}</pre>,
        blockquote: ({ children }) => <blockquote className="mb-3 border-l-2 border-primary/40 pl-4 italic text-muted-foreground">{children}</blockquote>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
