// StrictC IR Generator - Three-Address Code

export function generateIR(ast) {
  const instructions = [];
  let tempCount = 0;
  let labelCount = 0;

  function newTemp() { return `t${tempCount++}`; }
  function newLabel() { return `L${labelCount++}`; }

  function emit(op, arg1, arg2, result) {
    instructions.push({ op, arg1: arg1 ?? '', arg2: arg2 ?? '', result: result ?? '' });
  }

  function generateNode(node) {
    if (!node) return null;

    switch (node.type) {
      case 'Program':
        node.body.forEach(n => generateNode(n));
        return null;

      case 'VarDecl':
        emit('DECLARE', node.dataType, '', node.name);
        if (node.init) {
          const val = generateNode(node.init);
          emit('ASSIGN', val, '', node.name);
        }
        return null;

      case 'ConstDecl':
        emit('CONST_DECLARE', node.dataType, '', node.name);
        if (node.value) {
          const val = generateNode(node.value);
          emit('ASSIGN', val, '', node.name);
        }
        return null;

      case 'ArrayDecl':
        emit('ARRAY_DECLARE', node.dataType, generateNode(node.size), node.name);
        if (node.init) {
          node.init.forEach((el, i) => {
            const val = generateNode(el);
            emit('ARRAY_STORE', node.name, String(i), val);
          });
        }
        return null;

      case 'FunctionDecl': {
        emit('FUNC_BEGIN', node.name, node.params.map(p => `${p.dataType} ${p.name}`).join(', '), '');
        node.params.forEach(p => emit('PARAM', p.dataType, '', p.name));
        generateNode(node.body);
        emit('FUNC_END', node.name, '', '');
        return null;
      }

      case 'Block':
        node.body.forEach(s => generateNode(s));
        return null;

      case 'ExpressionStatement':
        generateNode(node.expression);
        return null;

      case 'ShowStatement': {
        node.args.forEach(a => {
          const val = generateNode(a);
          if (a.type === 'StringLiteral') {
            emit('SHOW_STR', val, '', '');
          } else {
            emit('SHOW_INT', val, '', '');
          }
        });
        emit('SHOW_NEWLINE', '', '', '');
        return null;
      }

      case 'IfStatement': {
        const cond = generateNode(node.condition);
        const elseLabel = newLabel();
        const endLabel = newLabel();
        if (node.alternate) {
          emit('IF_FALSE', cond, '', elseLabel);
          generateNode(node.consequent);
          emit('GOTO', '', '', endLabel);
          emit('LABEL', '', '', elseLabel);
          generateNode(node.alternate);
          emit('LABEL', '', '', endLabel);
        } else {
          emit('IF_FALSE', cond, '', endLabel);
          generateNode(node.consequent);
          emit('LABEL', '', '', endLabel);
        }
        return null;
      }

      case 'WhileStatement': {
        const startLabel = newLabel();
        const endLabel = newLabel();
        emit('LABEL', '', '', startLabel);
        const cond = generateNode(node.condition);
        emit('IF_FALSE', cond, '', endLabel);
        generateNode(node.body);
        emit('GOTO', '', '', startLabel);
        emit('LABEL', '', '', endLabel);
        return null;
      }

      case 'ForStatement': {
        if (node.init) generateNode(node.init);
        const startLabel = newLabel();
        const endLabel = newLabel();
        emit('LABEL', '', '', startLabel);
        if (node.condition) {
          const cond = generateNode(node.condition);
          emit('IF_FALSE', cond, '', endLabel);
        }
        generateNode(node.body);
        if (node.update) generateNode(node.update);
        emit('GOTO', '', '', startLabel);
        emit('LABEL', '', '', endLabel);
        return null;
      }

      // Extended: repeat(n) → for(_rc=0; _rc<n; _rc++)
      case 'RepeatStatement': {
        const countVal = generateNode(node.count);
        const counter = newTemp();
        emit('ASSIGN', '0', '', counter);
        const startLabel = newLabel();
        const endLabel = newLabel();
        emit('LABEL', '', '', startLabel);
        const cond = newTemp();
        emit('LT', counter, countVal, cond);
        emit('IF_FALSE', cond, '', endLabel);
        generateNode(node.body);
        const inc = newTemp();
        emit('ADD', counter, '1', inc);
        emit('ASSIGN', inc, '', counter);
        emit('GOTO', '', '', startLabel);
        emit('LABEL', '', '', endLabel);
        return null;
      }

      // Extended: foreach(x in arr) → for(i=0; i<len; i++) { x = arr[i]; ... }
      case 'ForeachStatement': {
        const idx = newTemp();
        const len = newTemp();
        emit('ARRAY_LENGTH', node.array, '', len);
        emit('ASSIGN', '0', '', idx);
        const startLabel = newLabel();
        const endLabel = newLabel();
        emit('LABEL', '', '', startLabel);
        const cond = newTemp();
        emit('LT', idx, len, cond);
        emit('IF_FALSE', cond, '', endLabel);
        const elemVal = newTemp();
        emit('ARRAY_LOAD', node.array, idx, elemVal);
        emit('ASSIGN', elemVal, '', node.variable);
        generateNode(node.body);
        const inc = newTemp();
        emit('ADD', idx, '1', inc);
        emit('ASSIGN', inc, '', idx);
        emit('GOTO', '', '', startLabel);
        emit('LABEL', '', '', endLabel);
        return null;
      }

      // Extended: range(i, start, end) → for(i=start; i<end; i++)
      case 'RangeStatement': {
        const startVal = generateNode(node.start);
        const endVal = generateNode(node.end);
        emit('ASSIGN', startVal, '', node.variable);
        const startLabel = newLabel();
        const endLabel = newLabel();
        emit('LABEL', '', '', startLabel);
        const cond = newTemp();
        emit('LT', node.variable, endVal, cond);
        emit('IF_FALSE', cond, '', endLabel);
        generateNode(node.body);
        const inc = newTemp();
        emit('ADD', node.variable, '1', inc);
        emit('ASSIGN', inc, '', node.variable);
        emit('GOTO', '', '', startLabel);
        emit('LABEL', '', '', endLabel);
        return null;
      }

      case 'ReturnStatement': {
        if (node.value) {
          const val = generateNode(node.value);
          emit('RETURN', val, '', '');
        } else {
          emit('RETURN', '', '', '');
        }
        return null;
      }

      case 'Assignment': {
        const val = generateNode(node.right);
        if (node.left.type === 'ArrayAccess') {
          const idx = generateNode(node.left.index);
          const arrName = node.left.array.name || node.left.array;
          emit('ARRAY_STORE', arrName, idx, val);
        } else if (node.left.type === 'Identifier') {
          if (node.operator === '=') {
            emit('ASSIGN', val, '', node.left.name);
          } else {
            const opMap = { '+=': 'ADD', '-=': 'SUB', '*=': 'MUL', '/=': 'DIV' };
            const t = newTemp();
            emit(opMap[node.operator], node.left.name, val, t);
            emit('ASSIGN', t, '', node.left.name);
          }
        }
        return node.left.type === 'Identifier' ? node.left.name : val;
      }

      case 'BinaryExpr': {
        const left = generateNode(node.left);
        const right = generateNode(node.right);
        const result = newTemp();
        const opMap = {
          '+': 'ADD', '-': 'SUB', '*': 'MUL', '/': 'DIV', '%': 'MOD',
          '==': 'EQ', '!=': 'NEQ', '<': 'LT', '>': 'GT', '<=': 'LTE', '>=': 'GTE',
          '&&': 'AND', '||': 'OR'
        };
        emit(opMap[node.operator] || node.operator, left, right, result);
        return result;
      }

      case 'UnaryExpr': {
        const operand = generateNode(node.operand);
        const result = newTemp();
        if (node.operator === '-') emit('NEG', operand, '', result);
        else if (node.operator === '!') emit('NOT', operand, '', result);
        return result;
      }

      case 'PrefixExpr': {
        const name = node.operand.name || generateNode(node.operand);
        const result = newTemp();
        if (node.operator === '++') { emit('ADD', name, '1', result); emit('ASSIGN', result, '', name); }
        else { emit('SUB', name, '1', result); emit('ASSIGN', result, '', name); }
        return name;
      }

      case 'PostfixExpr': {
        const name = node.operand.name || generateNode(node.operand);
        const old = newTemp();
        emit('ASSIGN', name, '', old);
        const result = newTemp();
        if (node.operator === '++') { emit('ADD', name, '1', result); emit('ASSIGN', result, '', name); }
        else { emit('SUB', name, '1', result); emit('ASSIGN', result, '', name); }
        return old;
      }

      case 'FunctionCall': {
        const args = node.args.map(a => generateNode(a));
        args.forEach(a => emit('ARG', a, '', ''));
        const result = newTemp();
        const fname = node.callee.name || generateNode(node.callee);
        emit('CALL', fname, String(args.length), result);
        return result;
      }

      case 'ArrayAccess': {
        const idx = generateNode(node.index);
        const result = newTemp();
        const arrName = node.array.name || generateNode(node.array);
        emit('ARRAY_LOAD', arrName, idx, result);
        return result;
      }

      case 'Identifier': return node.name;
      case 'IntLiteral': return String(node.value);
      case 'FloatLiteral': return String(node.value);
      case 'CharLiteral': return `'${node.value}'`;
      case 'StringLiteral': return `"${node.value}"`;
      default: return null;
    }
  }

  generateNode(ast);
  return instructions;
}
