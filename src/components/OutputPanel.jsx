import React, { useState, useCallback } from 'react';
import ErrorPanel from './ErrorPanel.jsx';

const TABS = [
  { key: 'tokens', label: 'Tokens' },
  { key: 'ast', label: 'AST' },
  { key: 'symbolTable', label: 'Symbol Table' },
  { key: 'ir', label: 'IR Code' },
  { key: 'assembly', label: 'Assembly' },
  { key: 'errors', label: 'Errors' },
];

function TokensView({ tokens }) {
  if (!tokens || tokens.length === 0) return <div className="sc-empty">No tokens generated</div>;
  return (
    <div className="sc-table-wrap">
      <table className="sc-token-table">
        <thead>
          <tr><th>#</th><th>Type</th><th>Value</th><th>Line</th><th>Col</th></tr>
        </thead>
        <tbody>
          {tokens.map((t, i) => (
            <tr key={i}>
              <td className="sc-td-num">{i + 1}</td>
              <td><span className="sc-token-type">{t.type}</span></td>
              <td className="sc-td-val">{String(t.value)}</td>
              <td className="sc-td-num">{t.line}</td>
              <td className="sc-td-num">{t.col}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getNodeInfo(node) {
  const label = node.type || node.op || 'Node';
  const details = [];
  if (node.name) details.push(node.name);
  if (node.dataType) details.push(node.dataType);
  if (node.value !== undefined && node.value !== null && typeof node.value !== 'object') details.push(String(node.value));
  if (node.operator) details.push(node.operator);
  if (node.variable) details.push(node.variable);
  if (node.array && typeof node.array === 'string') details.push(node.array);

  const childKeys = Object.keys(node).filter(k => {
    if (['type', 'op', 'name', 'dataType', 'value', 'operator', 'line', 'col', 'isConst', 'isArray', 'severity', 'message', 'phase', 'variable', 'array'].includes(k)) return false;
    const v = node[k];
    return v && (Array.isArray(v) ? v.some(item => item && typeof item === 'object') : typeof v === 'object');
  });

  const children = [];
  childKeys.forEach(key => {
    const val = node[key];
    if (Array.isArray(val)) {
      val.forEach((item, i) => {
        if (item && typeof item === 'object') {
          children.push({ node: item, edgeLabel: val.length > 1 ? `${key}[${i}]` : key });
        }
      });
    } else if (typeof val === 'object') {
      children.push({ node: val, edgeLabel: key });
    }
  });

  return { label, details, children };
}

function ASTNodeBox({ node, expanded, onToggle }) {
  const { label, details, children } = getNodeInfo(node);
  const hasChildren = children.length > 0;

  const colorMap = {
    'Program': 'sc-node-program',
    'FunctionDecl': 'sc-node-func',
    'VarDecl': 'sc-node-var',
    'ConstDecl': 'sc-node-var',
    'ArrayDecl': 'sc-node-var',
    'IfStatement': 'sc-node-control',
    'WhileStatement': 'sc-node-control',
    'ForStatement': 'sc-node-control',
    'RepeatStatement': 'sc-node-control',
    'ForeachStatement': 'sc-node-control',
    'RangeStatement': 'sc-node-control',
    'ReturnStatement': 'sc-node-return',
    'ShowStatement': 'sc-node-show',
    'BinaryExpr': 'sc-node-expr',
    'UnaryExpr': 'sc-node-expr',
    'Assignment': 'sc-node-expr',
    'FunctionCall': 'sc-node-call',
    'IntLiteral': 'sc-node-literal',
    'FloatLiteral': 'sc-node-literal',
    'CharLiteral': 'sc-node-literal',
    'StringLiteral': 'sc-node-literal',
    'Identifier': 'sc-node-ident',
    'Block': 'sc-node-block',
  };

  const colorClass = colorMap[label] || 'sc-node-default';

  return (
    <div className={`sc-ast-visual-node ${colorClass}`} onClick={hasChildren ? onToggle : undefined} style={{ cursor: hasChildren ? 'pointer' : 'default' }}>
      <div className="sc-ast-node-type">{label}</div>
      {details.length > 0 && <div className="sc-ast-node-detail">{details.join(', ')}</div>}
      {node.line && <div className="sc-ast-node-loc">L{node.line}</div>}
      {hasChildren && <div className="sc-ast-node-toggle">{expanded ? '▾' : '▸'} {children.length}</div>}
    </div>
  );
}

function ASTTreeVisual({ node, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth < 3);
  const { children } = getNodeInfo(node);
  if (!node || typeof node !== 'object') return null;

  return (
    <div className="sc-ast-tree-visual-node">
      <ASTNodeBox node={node} expanded={expanded} onToggle={() => setExpanded(e => !e)} />
      {expanded && children.length > 0 && (
        <div className="sc-ast-tree-children">
          {children.map((child, i) => (
            <div key={i} className="sc-ast-tree-child-row">
              <div className="sc-ast-tree-connector">
                <div className="sc-ast-tree-vline" />
                <div className="sc-ast-tree-hline" />
              </div>
              <div className="sc-ast-tree-child-content">
                <span className="sc-ast-edge-label">{child.edgeLabel}</span>
                <ASTTreeVisual node={child.node} depth={depth + 1} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ASTView({ ast }) {
  if (!ast) return <div className="sc-empty">No AST generated</div>;
  return (
    <div className="sc-ast-tree-visual">
      <ASTTreeVisual node={ast} />
    </div>
  );
}

function SymbolTableView({ symbols }) {
  if (!symbols || symbols.length === 0) return <div className="sc-empty">No symbols found</div>;
  return (
    <div className="sc-table-wrap">
      <table className="sc-token-table">
        <thead>
          <tr><th>Name</th><th>Type</th><th>Scope</th><th>Const</th><th>Array</th><th>Line</th></tr>
        </thead>
        <tbody>
          {symbols.map((s, i) => (
            <tr key={i}>
              <td className="sc-sym-name">{s.name}</td>
              <td>{s.dataType}</td>
              <td className="sc-td-num">{s.scope}</td>
              <td>{s.isConst ? '✓' : ''}</td>
              <td>{s.isArray ? '✓' : ''}</td>
              <td className="sc-td-num">{s.line}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IRView({ ir }) {
  if (!ir || ir.length === 0) return <div className="sc-empty">No IR code generated</div>;
  return (
    <div className="sc-table-wrap">
      <table className="sc-token-table">
        <thead>
          <tr><th>#</th><th>Op</th><th>Arg1</th><th>Arg2</th><th>Result</th></tr>
        </thead>
        <tbody>
          {ir.map((instr, i) => (
            <tr key={i}>
              <td className="sc-td-num">{i + 1}</td>
              <td><span className="sc-ir-op">{instr.op}</span></td>
              <td>{instr.arg1}</td>
              <td>{instr.arg2}</td>
              <td className="sc-ir-result">{instr.result}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AssemblyView({ assembly }) {
  if (!assembly) return <div className="sc-empty">No assembly generated</div>;
  return <pre className="sc-pre sc-asm">{assembly}</pre>;
}

export default function OutputPanel({ result }) {
  const [activeTab, setActiveTab] = useState('tokens');

  const errorCount = result ? result.errors.filter(e => e.severity === 'error').length : 0;

  return (
    <div className="sc-output-panel">
      {/* Phase status bar */}
      {result && (
        <div className="sc-phase-bar">
          {Object.entries(result.phases).map(([key, phase]) => (
            <div key={key} className={`sc-phase-chip ${phase.success ? 'sc-phase-ok' : (result.errors.some(e => e.phase?.toLowerCase() === key) ? 'sc-phase-fail' : 'sc-phase-pending')}`}>
              <span className="sc-phase-icon">{phase.success ? '✓' : '○'}</span>
              <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
              <span className="sc-phase-time">{phase.time.toFixed(1)}ms</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="sc-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`sc-tab ${activeTab === tab.key ? 'sc-tab-active' : ''} ${tab.key === 'errors' && errorCount > 0 ? 'sc-tab-error' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {tab.key === 'errors' && errorCount > 0 && (
              <span className="sc-error-count">{errorCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="sc-tab-content">
        {!result ? (
          <div className="sc-empty">Click "Compile" to see output</div>
        ) : (
          <>
            {activeTab === 'tokens' && <TokensView tokens={result.tokens} />}
            {activeTab === 'ast' && <ASTView ast={result.ast} />}
            {activeTab === 'symbolTable' && <SymbolTableView symbols={result.symbolTable} />}
            {activeTab === 'ir' && <IRView ir={result.ir} />}
            {activeTab === 'assembly' && <AssemblyView assembly={result.assembly} />}
            {activeTab === 'errors' && <ErrorPanel errors={result.errors} />}
          </>
        )}
      </div>
    </div>
  );
}
