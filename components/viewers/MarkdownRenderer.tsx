"use client";

import React, { useState, useMemo } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

interface MarkdownRendererProps {
  content: string;
}

interface CodeBlockProps {
  language: string;
  code: string;
}

// VSCode-style dark theme code block for premium contrast
const CodeBlock = React.memo(({ language, code }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Đã sao chép mã nguồn!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-slate-200/80 bg-[#1e1e2e] font-mono text-xs shadow-2xs">
      <div className="bg-[#181825] px-4 py-2 border-b border-[#252538] flex justify-between items-center text-slate-400 text-[10px] font-bold tracking-wider select-none">
        <span>{language.toUpperCase()}</span>
        <button
          onClick={handleCopyCode}
          className="flex items-center gap-1 hover:text-white transition duration-150 cursor-pointer"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          <span>{copied ? "Đã sao chép" : "Sao chép"}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[#cdd6f4] leading-[1.7]">
        <code>{code}</code>
      </pre>
    </div>
  );
});

CodeBlock.displayName = "CodeBlock";

const MarkdownRenderer = React.memo(({ content }: MarkdownRendererProps) => {
  
  // Parse bold (**bold**), inline code (`code`), inline math ($math$), and links ([text](url))
  const parseInlineElements = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|\$.*?\$|\[.*?\]\(.*?\))/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-bold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={index} className="bg-slate-100 text-rose-600 font-mono text-[0.85em] px-1.5 py-0.5 rounded-md border border-slate-200/50">
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith("$") && part.endsWith("$")) {
        return (
          <span key={index} className="font-serif italic text-blue-600 bg-blue-50/50 px-1 rounded">
            {part.slice(1, -1)}
          </span>
        );
      }
      if (part.startsWith("[") && part.includes("](")) {
        const match = part.match(/\[(.*?)\]\((.*?)\)/);
        if (match) {
          return (
            <a key={index} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline font-bold transition">
              {match[1]}
            </a>
          );
        }
      }
      return part;
    });
  };

  // Parses a Markdown Table (| col1 | col2 |)
  const parseTable = (lines: string[], startIndex: number) => {
    const tableLines = [];
    let idx = startIndex;
    while (idx < lines.length && lines[idx].trim().startsWith("|")) {
      tableLines.push(lines[idx]);
      idx++;
    }

    if (tableLines.length >= 3) {
      const headers = tableLines[0].split("|").map(s => s.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
      const rows = tableLines.slice(2).map(rowLine => 
        rowLine.split("|").map(s => s.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1)
      );

      return {
        nextIndex: idx - 1,
        element: (
          <div key={`table-${startIndex}`} className="my-4 overflow-x-auto rounded-xl border border-slate-200/80 shadow-3xs max-w-full">
            <table className="w-full border-collapse text-left text-xs font-semibold text-slate-700 bg-white">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-bold uppercase text-[9px] tracking-wider">
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} className="px-4 py-3 font-bold select-none">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/50 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-4 py-3 font-semibold text-slate-700">{parseInlineElements(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      };
    }
    return null;
  };

  const parsedContent = useMemo(() => {
    if (!content) return null;

    // Step 1: Split into code blocks, LaTeX blocks, and regular text blocks
    const blocks = content.split(/(```[\s\S]*?```|\$\$[\s\S]*?\$\$)/g);

    return blocks.map((block, index) => {
      // 1. Code Block parsing
      if (block.startsWith("```")) {
        const lines = block.split("\n");
        const language = lines[0].replace("```", "").trim() || "code";
        const codeContent = lines.slice(1, -1).join("\n");

        return <CodeBlock key={index} language={language} code={codeContent} />;
      }

      // 2. LaTeX Block parsing
      if (block.startsWith("$$")) {
        const mathContent = block.replace(/\$\$/g, "").trim();
        return (
          <div key={index} className="my-4 p-4 rounded-xl bg-blue-50/50 border border-blue-100 text-center font-serif text-sm text-blue-800 overflow-x-auto shadow-3xs">
            {mathContent}
          </div>
        );
      }

      // 3. Regular lines parsing
      const lines = block.split("\n");
      const elements: React.ReactNode[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.trim().length === 0) {
          elements.push(<div key={`empty-${i}`} className="h-1.5" />);
          continue;
        }

        // Table
        if (line.trim().startsWith("|")) {
          const tableObj = parseTable(lines, i);
          if (tableObj) {
            elements.push(tableObj.element);
            i = tableObj.nextIndex;
            continue;
          }
        }

        // Blockquote
        if (line.startsWith("> ")) {
          const quoteLines = [];
          let idx = i;
          while (idx < lines.length && lines[idx].startsWith("> ")) {
            quoteLines.push(lines[idx].substring(2));
            idx++;
          }
          elements.push(
            <blockquote key={`quote-${i}`} className="border-l-4 border-blue-500 bg-blue-50/30 px-4 py-3 rounded-r-xl italic my-4 text-slate-650 font-semibold leading-relaxed">
              {quoteLines.map((ql, qIdx) => (
                <p key={qIdx}>{parseInlineElements(ql)}</p>
              ))}
            </blockquote>
          );
          i = idx - 1;
          continue;
        }

        // Headers
        if (line.startsWith("### ")) {
          elements.push(
            <h3 key={i} className="text-sm font-bold text-slate-900 mt-4 mb-1.5 leading-snug">
              {parseInlineElements(line.replace("### ", ""))}
            </h3>
          );
          continue;
        }
        if (line.startsWith("## ")) {
          elements.push(
            <h2 key={i} className="text-base font-bold text-slate-950 mt-5 mb-2 border-b border-slate-100 pb-1.5 leading-snug">
              {parseInlineElements(line.replace("## ", ""))}
            </h2>
          );
          continue;
        }
        if (line.startsWith("# ")) {
          elements.push(
            <h1 key={i} className="text-lg font-extrabold text-slate-950 mt-6 mb-3 leading-normal">
              {parseInlineElements(line.replace("# ", ""))}
            </h1>
          );
          continue;
        }

        // Bullet Lists
        if (line.startsWith("- ") || line.startsWith("* ")) {
          elements.push(
            <ul key={i} className="list-disc pl-5 my-1 text-slate-700 text-xs leading-[1.8] font-semibold space-y-1">
              <li>{parseInlineElements(line.substring(2))}</li>
            </ul>
          );
          continue;
        }

        // Numbered Lists
        const numMatch = line.match(/^(\d+)\.\s(.*)/);
        if (numMatch) {
          elements.push(
            <ol key={i} className="list-decimal pl-5 my-1 text-slate-700 text-xs leading-[1.8] font-semibold space-y-1">
              <li value={parseInt(numMatch[1])}>{parseInlineElements(numMatch[2])}</li>
            </ol>
          );
          continue;
        }

        // Standard Paragraph
        elements.push(
          <p key={i} className="text-xs text-slate-700 leading-[1.8] font-semibold">
            {parseInlineElements(line)}
          </p>
        );
      }

      return <div key={index} className="space-y-1.5">{elements}</div>;
    });
  }, [content]);

  return <div className="prose prose-slate max-w-none font-chat leading-relaxed">{parsedContent}</div>;
});

MarkdownRenderer.displayName = "MarkdownRenderer";

export default MarkdownRenderer;
