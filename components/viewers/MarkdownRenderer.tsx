"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Safe basic regex parser for Markdown blocks, math formulas, and code blocks
  const parseMarkdown = (text: string) => {
    if (!text) return null;

    // Step 1: Split text into blocks (code blocks, math blocks, normal paragraphs)
    const blocks = text.split(/(```[\s\S]*?```|\$\$[\s\S]*?\$\$)/g);

    return blocks.map((block, index) => {
      // 1. Code Block parsing
      if (block.startsWith("```")) {
        const lines = block.split("\n");
        const language = lines[0].replace("```", "").trim() || "code";
        const codeContent = lines.slice(1, -1).join("\n");

        return (
          <div key={index} className="my-4 rounded-xl overflow-hidden border border-white/10 bg-slate-950 font-mono text-xs md:text-sm">
            <div className="bg-white/5 px-4 py-2 border-b border-white/5 flex justify-between items-center text-slate-400 text-xs">
              <span>{language.toUpperCase()}</span>
              <Button
                onClick={() => navigator.clipboard.writeText(codeContent)}
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-slate-400 hover:text-white"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <pre className="p-4 overflow-x-auto text-cyan-300">
              <code>{codeContent}</code>
            </pre>
          </div>
        );
      }

      // 2. Math LaTeX Block parsing ($$...$$)
      if (block.startsWith("$$")) {
        const mathContent = block.replace(/\$\$/g, "").trim();
        return (
          <div key={index} className="my-4 p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-center font-serif text-lg text-cyan-300 overflow-x-auto">
            {mathContent}
          </div>
        );
      }

      // 3. Regular Markdown Lines parsing (Headers, lists, tables)
      const lines = block.split("\n");
      return (
        <div key={index} className="space-y-2">
          {lines.map((line, lIndex) => {
            // Empty lines
            if (line.trim().length === 0) return <div key={lIndex} className="h-2" />;

            // H3
            if (line.startsWith("### ")) {
              return (
                <h3 key={lIndex} className="text-lg font-bold text-cyan-400 mt-4 mb-2">
                  {line.replace("### ", "")}
                </h3>
              );
            }

            // H2
            if (line.startsWith("## ")) {
              return (
                <h2 key={lIndex} className="text-xl font-bold text-white mt-6 mb-3 border-b border-white/5 pb-1">
                  {line.replace("## ", "")}
                </h2>
              );
            }

            // H1
            if (line.startsWith("# ")) {
              return (
                <h1 key={lIndex} className="text-2xl font-black text-white mt-8 mb-4">
                  {line.replace("# ", "")}
                </h1>
              );
            }

            // Bullet Lists
            if (line.startsWith("- ") || line.startsWith("* ")) {
              return (
                <ul key={lIndex} className="list-disc pl-6 text-sm text-slate-300 space-y-1">
                  <li>{parseInlineElements(line.substring(2))}</li>
                </ul>
              );
            }

            // Numbered Lists
            const numMatch = line.match(/^(\d+)\.\s(.*)/);
            if (numMatch) {
              return (
                <ol key={lIndex} className="list-decimal pl-6 text-sm text-slate-300 space-y-1">
                  <li value={parseInt(numMatch[1])}>{parseInlineElements(numMatch[2])}</li>
                </ol>
              );
            }

            // Standard Paragraph
            return (
              <p key={lIndex} className="text-sm text-slate-300 leading-relaxed">
                {parseInlineElements(line)}
              </p>
            );
          })}
        </div>
      );
    });
  };

  // Parse Bold, Italic, inline code, and inline math ($...$)
  const parseInlineElements = (text: string) => {
    // Replace inline code `code`
    // Replace bold **bold**
    // Replace inline math $x = 2$
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|\$.*?\$)/g);

    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-extrabold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={index} className="px-1.5 py-0.5 rounded bg-slate-900 border border-white/5 text-cyan-300 font-mono text-xs">
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith("$") && part.endsWith("$")) {
        return (
          <span key={index} className="font-serif italic text-cyan-400 bg-cyan-500/5 px-1 rounded">
            {part.slice(1, -1)}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="relative p-6 bg-slate-950/40 rounded-2xl border border-white/5 text-slate-300 space-y-4">
      {/* Copy Answer Helper */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button
          onClick={handleCopy}
          variant="outline"
          size="sm"
          className="border-white/5 hover:border-cyan-500/50 bg-slate-900/80 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              Đã sao chép
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Sao chép lời giải
            </>
          )}
        </Button>
      </div>

      <div className="prose prose-invert max-w-none pr-12">
        {parseMarkdown(content)}
      </div>
    </div>
  );
}
