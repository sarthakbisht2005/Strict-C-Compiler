import React, { useState } from 'react';
import CodeEditor from '../components/CodeEditor.jsx';
import OutputPanel from '../components/OutputPanel.jsx';
import SamplePrograms from '../components/SamplePrograms.jsx';
import { compile } from '../compiler/compiler.js';

const DEFAULT_CODE = `// StrictC - Mini C Compiler
// Try the sample programs or write your own!
// Use show() to print output!

int factorial(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

int main() {
    int result = factorial(5);
    show("Factorial of 5 = ", result);

    range(i, 1, 6) {
        show("factorial(", i, ") = ", factorial(i));
    }

    return 0;
}`;

export default function Index() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [result, setResult] = useState(null);
  const [compiling, setCompiling] = useState(false);

  const handleCompile = () => {
    setCompiling(true);
    setTimeout(() => {
      const output = compile(code);
      setResult(output);
      setCompiling(false);
    }, 50);
  };

  const handleDownload = () => {
    if (result && result.assembly) {
      const blob = new Blob([result.assembly], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'output.asm';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const errorCount = result ? result.errors.filter(e => e.severity === 'error').length : 0;

  return (
    <div className="sc-app">
      {/* Header */}
      <header className="sc-header">
        <div className="sc-header-left">
          <h1 className="sc-title">
            <span className="sc-title-icon">⚡</span>
            StrictC
          </h1>
          <span className="sc-subtitle">Mini C Compiler with Extended Features</span>
        </div>
        <div className="sc-header-right">
          <SamplePrograms onSelect={setCode} />
          <button
            className={`sc-compile-btn ${compiling ? 'sc-compiling' : ''}`}
            onClick={handleCompile}
            disabled={compiling}
          >
            {compiling ? '⟳ Compiling...' : '▶ Compile'}
          </button>
          {result && result.assembly && (
            <button className="sc-download-btn" onClick={handleDownload}>
              ↓ Download ASM
            </button>
          )}
        </div>
      </header>

      {/* Status bar */}
      {result && (
        <div className={`sc-status-bar ${errorCount > 0 ? 'sc-status-error' : 'sc-status-success'}`}>
          {errorCount > 0
            ? `✖ Compilation failed with ${errorCount} error${errorCount > 1 ? 's' : ''}`
            : `✓ Compilation successful — ${result.tokens.length} tokens, ${result.ir.length} IR instructions, ${result.assembly.split('\n').length} lines of assembly`
          }
        </div>
      )}

      {/* Main content */}
      <div className="sc-main">
        <div className="sc-editor-pane">
          <div className="sc-pane-header">
            <span>📄 Source Code</span>
            <span className="sc-line-count">{code.split('\n').length} lines</span>
          </div>
          <CodeEditor code={code} onChange={setCode} />
        </div>
        <div className="sc-output-pane">
          <div className="sc-pane-header">
            <span>📊 Compiler Output</span>
          </div>
          <OutputPanel result={result} />
        </div>
      </div>
    </div>
  );
}
