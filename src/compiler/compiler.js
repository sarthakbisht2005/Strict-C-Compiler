// StrictC Compiler - Pipeline Orchestrator

import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import { analyze } from './semantic.js';
import { generateIR } from './irGenerator.js';
import { generateAssembly } from './codeGenerator.js';

export function compile(source) {
  const result = {
    tokens: [],
    ast: null,
    symbolTable: [],
    ir: [],
    assembly: '',
    errors: [],
    phases: {
      lexer: { success: false, time: 0 },
      parser: { success: false, time: 0 },
      semantic: { success: false, time: 0 },
      ir: { success: false, time: 0 },
      codegen: { success: false, time: 0 },
    }
  };

  // Phase 1: Lexical Analysis
  let t0 = performance.now();
  const lexResult = tokenize(source);
  result.phases.lexer.time = performance.now() - t0;
  result.tokens = lexResult.tokens;
  result.errors.push(...lexResult.errors.map(e => ({ ...e, phase: 'Lexer', severity: 'error' })));
  if (lexResult.errors.length > 0) return result;
  result.phases.lexer.success = true;

  // Phase 2: Syntax Analysis
  t0 = performance.now();
  const parseResult = parse(lexResult.tokens);
  result.phases.parser.time = performance.now() - t0;
  result.ast = parseResult.ast;
  result.errors.push(...parseResult.errors.map(e => ({ ...e, phase: 'Parser', severity: 'error' })));
  if (parseResult.errors.length > 0) return result;
  result.phases.parser.success = true;

  // Phase 3: Semantic Analysis
  t0 = performance.now();
  const semResult = analyze(parseResult.ast);
  result.phases.semantic.time = performance.now() - t0;
  result.symbolTable = semResult.symbolTable;
  result.errors.push(...semResult.errors.map(e => ({ ...e, phase: 'Semantic' })));
  const semErrors = semResult.errors.filter(e => e.severity === 'error');
  if (semErrors.length > 0) return result;
  result.phases.semantic.success = true;

  // Phase 4: Intermediate Code Generation
  t0 = performance.now();
  try {
    result.ir = generateIR(parseResult.ast);
    result.phases.ir.time = performance.now() - t0;
    result.phases.ir.success = true;
  } catch (e) {
    result.phases.ir.time = performance.now() - t0;
    result.errors.push({ message: `IR Generation failed: ${e.message}`, phase: 'IR', severity: 'error', line: 0 });
    return result;
  }

  // Phase 5: Target Code Generation
  t0 = performance.now();
  try {
    result.assembly = generateAssembly(result.ir, result.symbolTable);
    result.phases.codegen.time = performance.now() - t0;
    result.phases.codegen.success = true;
  } catch (e) {
    result.phases.codegen.time = performance.now() - t0;
    result.errors.push({ message: `Code generation failed: ${e.message}`, phase: 'CodeGen', severity: 'error', line: 0 });
  }

  return result;
}
