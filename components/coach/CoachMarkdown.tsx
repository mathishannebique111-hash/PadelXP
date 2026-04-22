"use client";

import React from "react";

/**
 * Rendu markdown léger pour les réponses du coach IA.
 * Gère : **bold**, # headers, - listes, 1. listes numérotées, sauts de ligne.
 * Pas de dépendance externe.
 */
export default function CoachMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listBuffer: { type: "ul" | "ol"; items: React.ReactNode[] } | null = null;
  let key = 0;

  function flushList() {
    if (!listBuffer) return;
    if (listBuffer.type === "ul") {
      elements.push(
        <ul key={key++} className="list-disc list-inside space-y-1 my-2 text-white/90">
          {listBuffer.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    } else {
      elements.push(
        <ol key={key++} className="list-decimal list-inside space-y-1 my-2 text-white/90">
          {listBuffer.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      );
    }
    listBuffer = null;
  }

  function inlineFormat(text: string): React.ReactNode {
    // Handle **bold** and *italic*
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let partKey = 0;

    while (remaining.length > 0) {
      // Bold: **text**
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      if (boldMatch && boldMatch.index !== undefined) {
        if (boldMatch.index > 0) {
          parts.push(remaining.slice(0, boldMatch.index));
        }
        parts.push(
          <strong key={partKey++} className="font-semibold text-white">
            {boldMatch[1]}
          </strong>
        );
        remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
        continue;
      }
      // No more formatting found
      parts.push(remaining);
      break;
    }

    return parts.length === 1 ? parts[0] : <>{parts}</>;
  }

  for (const line of lines) {
    const trimmed = line.trim();

    // Empty line
    if (trimmed === "") {
      flushList();
      elements.push(<div key={key++} className="h-2" />);
      continue;
    }

    // Headers
    if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <h4 key={key++} className="text-sm font-bold text-white mt-3 mb-1">
          {inlineFormat(trimmed.slice(4))}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushList();
      elements.push(
        <h3 key={key++} className="text-base font-bold text-white mt-3 mb-1">
          {inlineFormat(trimmed.slice(3))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith("# ")) {
      flushList();
      elements.push(
        <h3 key={key++} className="text-base font-bold text-white mt-3 mb-1">
          {inlineFormat(trimmed.slice(2))}
        </h3>
      );
      continue;
    }

    // Unordered list
    if (/^[-*]\s/.test(trimmed)) {
      const itemText = trimmed.replace(/^[-*]\s+/, "");
      if (!listBuffer || listBuffer.type !== "ul") {
        flushList();
        listBuffer = { type: "ul", items: [] };
      }
      listBuffer.items.push(inlineFormat(itemText));
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(trimmed)) {
      const itemText = trimmed.replace(/^\d+\.\s+/, "");
      if (!listBuffer || listBuffer.type !== "ol") {
        flushList();
        listBuffer = { type: "ol", items: [] };
      }
      listBuffer.items.push(inlineFormat(itemText));
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={key++} className="text-sm text-white/90 leading-relaxed">
        {inlineFormat(trimmed)}
      </p>
    );
  }

  flushList();

  return <div className="space-y-0.5">{elements}</div>;
}
