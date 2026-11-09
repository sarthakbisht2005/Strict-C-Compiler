// StrictC Semantic Analyzer

export function analyze(ast) {
  const errors = [];
  const symbolTable = [];
  const scopes = [{}]; // stack of scopes
  let currentFunction = null;

  function currentScope() { return scopes[scopes.length - 1]; }
  function pushScope() { scopes.push({}); }
  function popScope() {
    const scope = scopes.pop();
    // Record all symbols for display
    for (const [name, info] of Object.entries(scope)) {
      symbolTable.push({ name, ...info, scope: scopes.length });
    }
  }

  function declare(name, info) {
    if (currentScope()[name]) {
      errors.push({ message: `Variable '${name}' is already declared in this scope`, line: info.line, severity: 'error' });
      return;
    }
    currentScope()[name] = info;
  }

  function lookup(name, line) {
    for (let i = scopes.length - 1; i >= 0; i--) {
      if (scopes[i][name]) return scopes[i][name];
    }
    errors.push({ message: `Undeclared identifier '${name}'`, line, severity: 'error' });
    return null;
  }

  function inferType(node) {
    if (!node) return 'void';
    switch (node.type) {
      case 'IntLiteral': return 'int';
      case 'FloatLiteral': return 'float';
      case 'CharLiteral': return 'char';
      case 'StringLiteral': return 'char*';
      case 'Identifier': {
        const sym = lookup(node.name, node.line);
        return sym ? sym.dataType : 'unknown';
      }
      case 'BinaryExpr': {
        const lt = inferType(node.left);
        const rt = inferType(node.right);
        if (lt === 'float' || rt === 'float') return 'float';
        if (lt === 'char' && rt === 'char') return 'int'; // char arithmetic => int
        return lt;
      }
      case 'UnaryExpr': return inferType(node.operand);
      case 'PrefixExpr': case 'PostfixExpr': return inferType(node.operand);
      case 'ArrayAccess': {
        const sym = lookup(node.array.name, node.line);
        return sym ? sym.dataType : 'unknown';
      }
      case 'FunctionCall': {
        if (node.callee.type === 'Identifier') {
          const sym = lookup(node.callee.name, node.line);
          return sym ? sym.dataType : 'unknown';
        }
        return 'unknown';
      }
      case 'Assignment': return inferType(node.right);
      default: return 'unknown';
    }
  }

  function checkTypeCompat(expected, actual, line, context) {
    if (expected === 'unknown' || actual === 'unknown') return;
    if (expected === actual) return;
    if (expected === 'float' && actual === 'int') return; // int -> float ok
    errors.push({
      message: `Type mismatch in ${context}: expected '${expected}' but got '${actual}'`,
      line,
      severity: 'error'
    });
  }

  function visitNode(node) {
    if (!node) return;
    switch (node.type) {
      case 'Program':
        node.body.forEach(n => visitNode(n));
        break;

      case 'VarDecl':
        declare(node.name, { dataType: node.dataType, isConst: false, isArray: false, line: node.line });
        if (node.init) {
          visitNode(node.init);
          const initType = inferType(node.init);
          checkTypeCompat(node.dataType, initType, node.line, `initialization of '${node.name}'`);
        }
        break;

      case 'ConstDecl':
        declare(node.name, { dataType: node.dataType, isConst: true, isArray: false, line: node.line });
        if (node.value) {
          visitNode(node.value);
          const valType = inferType(node.value);
          checkTypeCompat(node.dataType, valType, node.line, `const initialization of '${node.name}'`);
        }
        break;

      case 'ArrayDecl':
        declare(node.name, { dataType: node.dataType, isConst: false, isArray: true, size: node.size, line: node.line });
        if (node.init) {
          node.init.forEach(el => {
            visitNode(el);
            const elType = inferType(el);
            checkTypeCompat(node.dataType, elType, node.line, `array element of '${node.name}'`);
          });
        }
        break;

      case 'FunctionDecl': {
        declare(node.name, { dataType: node.dataType, isConst: false, isFunction: true, params: node.params, line: node.line });
        const prevFunc = currentFunction;
        currentFunction = node;
        pushScope();
        node.params.forEach(p => {
          declare(p.name, { dataType: p.dataType, isConst: false, isArray: false, line: node.line });
        });
        visitNode(node.body);
        popScope();
        currentFunction = prevFunc;
        break;
      }

      case 'Block':
        pushScope();
        node.body.forEach(s => visitNode(s));
        popScope();
        break;

      case 'IfStatement':
        visitNode(node.condition);
        visitNode(node.consequent);
        if (node.alternate) visitNode(node.alternate);
        break;

      case 'WhileStatement':
        visitNode(node.condition);
        visitNode(node.body);
        break;

      case 'ForStatement':
        pushScope();
        if (node.init) visitNode(node.init);
        if (node.condition) visitNode(node.condition);
        if (node.update) visitNode(node.update);
        visitNode(node.body);
        popScope();
        break;

      case 'RepeatStatement':
        visitNode(node.count);
        visitNode(node.body);
        break;

      case 'ForeachStatement': {
        const arrSym = lookup(node.array, node.line);
        if (arrSym && !arrSym.isArray) {
          errors.push({ message: `'${node.array}' is not an array (used in foreach)`, line: node.line, severity: 'error' });
        }
        pushScope();
        declare(node.variable, { dataType: arrSym ? arrSym.dataType : 'unknown', isConst: false, isArray: false, line: node.line });
        visitNode(node.body);
        popScope();
        break;
      }

      case 'RangeStatement':
        pushScope();
        declare(node.variable, { dataType: 'int', isConst: false, isArray: false, line: node.line });
        visitNode(node.start);
        visitNode(node.end);
        visitNode(node.body);
        popScope();
        break;

      case 'ReturnStatement':
        if (node.value) {
          visitNode(node.value);
          if (currentFunction && currentFunction.dataType !== 'void') {
            const retType = inferType(node.value);
            checkTypeCompat(currentFunction.dataType, retType, node.line, `return statement of '${currentFunction.name}'`);
          }
        }
        break;

      case 'ExpressionStatement':
        visitNode(node.expression);
        break;

      case 'ShowStatement':
        node.args.forEach(a => visitNode(a));
        break;

      case 'Assignment': {
        visitNode(node.left);
        visitNode(node.right);
        if (node.left.type === 'Identifier') {
          const sym = lookup(node.left.name, node.line);
          if (sym && sym.isConst) {
            errors.push({ message: `Cannot assign to constant '${node.left.name}'`, line: node.line, severity: 'error' });
          }
          if (sym) {
            const rhsType = inferType(node.right);
            checkTypeCompat(sym.dataType, rhsType, node.line, `assignment to '${node.left.name}'`);
          }
        }
        break;
      }

      case 'BinaryExpr':
        visitNode(node.left);
        visitNode(node.right);
        break;

      case 'UnaryExpr':
        visitNode(node.operand);
        break;

      case 'PrefixExpr': case 'PostfixExpr':
        visitNode(node.operand);
        break;

      case 'FunctionCall':
        visitNode(node.callee);
        node.args.forEach(a => visitNode(a));
        if (node.callee.type === 'Identifier') {
          const sym = lookup(node.callee.name, node.line);
          if (sym && sym.isFunction && sym.params) {
            if (node.args.length !== sym.params.length) {
              errors.push({
                message: `Function '${node.callee.name}' expects ${sym.params.length} arguments but got ${node.args.length}`,
                line: node.line, severity: 'error'
              });
            }
          }
        }
        break;

      case 'ArrayAccess':
        visitNode(node.array);
        visitNode(node.index);
        break;

      case 'Identifier':
        lookup(node.name, node.line);
        break;

      case 'IntLiteral': case 'FloatLiteral': case 'CharLiteral': case 'StringLiteral':
        break;

      default:
        break;
    }
  }

  visitNode(ast);

  // Collect remaining symbols from global scope
  const globalScope = scopes[0];
  for (const [name, info] of Object.entries(globalScope)) {
    symbolTable.push({ name, ...info, scope: 0 });
  }

  return { symbolTable, errors };
}
