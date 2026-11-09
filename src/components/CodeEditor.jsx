import React, { useState, useRef, useEffect, useCallback } from 'react';

const KEYWORDS = new Set([
  'int', 'float', 'char', 'void', 'if', 'else', 'while', 'for',
  'return', 'const', 'repeat', 'foreach', 'range', 'in', 'show'
]);

const TYPES = new Set(['int', 'float', 'char', 'void']);

export default function CodeEditor({ code, onChange }) {
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const highlightRef = useRef(null);

  const lines = code.split('\n');

  const syncScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current && highlightRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  function highlightLine(line) {
    // Simple syntax highlighting via spans
    return line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Comments
      .replace(/(\/\/.*$)/gm, '<span class="sc-comment">$1</span>')
      // Strings
      .replace(/("(?:[^"\\]|\\.)*")/g, '<span class="sc-string">$1</span>')
      // Char literals
      .replace(/('(?:[^'\\]|\\.)*')/g, '<span class="sc-string">$1</span>')
      // Numbers
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="sc-number">$1</span>')
      // Keywords
      .replace(/\b(if|else|while|for|return|const|repeat|foreach|range|in)\b/g, '<span class="sc-keyword">$1</span>')
      // Types
      .replace(/\b(int|float|char|void)\b/g, '<span class="sc-type">$1</span>');
  }

  const highlighted = lines.map(l => highlightLine(l)).join('\n');

  return (
    <div className="sc-editor-container">
      <div className="sc-line-numbers" ref={lineNumbersRef}>
        {lines.map((_, i) => (
          <div key={i} className="sc-line-num">{i + 1}</div>
        ))}
      </div>
      <div className="sc-code-area">
        <pre
          className="sc-highlight-layer"
          ref={highlightRef}
          dangerouslySetInnerHTML={{ __html: highlighted + '\n' }}
          aria-hidden="true"
        />
        <textarea
          ref={textareaRef}
          className="sc-textarea"
          value={code}
          onChange={e => onChange(e.target.value)}
          onScroll={syncScroll}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
        />
      </div>
    </div>
  );
}
