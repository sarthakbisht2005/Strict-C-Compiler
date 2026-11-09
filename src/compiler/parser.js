// StrictC Parser - Recursive Descent Parser → AST

import { TokenType } from './lexer.js';

export function parse(tokens) {
  let pos = 0;
  const errors = [];

  function current() { return tokens[pos] || { type: TokenType.EOF, value: 'EOF', line: 0, col: 0 }; }
  function peek() { return current(); }
  function advance() { const t = current(); pos++; return t; }
  function expect(type, msg) {
    const t = current();
    if (t.type !== type) {
      errors.push({ message: msg || `Expected ${type} but got '${t.value}'`, line: t.line, col: t.col });
      return t;
    }
    return advance();
  }
  function match(type) {
    if (current().type === type) { return advance(); }
    return null;
  }
  function isType(t) {
    return t === TokenType.INT || t === TokenType.FLOAT || t === TokenType.CHAR || t === TokenType.VOID;
  }

  function parseProgram() {
    const body = [];
    while (peek().type !== TokenType.EOF) {
      try {
        if (peek().type === TokenType.CONST) {
          body.push(parseConstDecl());
        } else if (isType(peek().type)) {
          body.push(parseDeclOrFunc());
        } else {
          errors.push({ message: `Unexpected token '${peek().value}' at top level`, line: peek().line, col: peek().col });
          advance();
        }
      } catch (e) {
        errors.push({ message: e.message, line: peek().line, col: peek().col });
        advance();
      }
    }
    return { type: 'Program', body, line: 1 };
  }

  function parseConstDecl() {
    const line = peek().line;
    expect(TokenType.CONST);
    const dtype = advance(); // type
    const name = expect(TokenType.IDENTIFIER, 'Expected identifier after const type');
    expect(TokenType.ASSIGN, "Expected '=' in const declaration");
    const value = parseExpression();
    expect(TokenType.SEMICOLON, "Expected ';' after const declaration");
    return { type: 'ConstDecl', dataType: dtype.value, name: name.value, value, line };
  }

  function parseDeclOrFunc() {
    const line = peek().line;
    const dtype = advance(); // type keyword
    const name = expect(TokenType.IDENTIFIER, 'Expected identifier');

    // Function declaration
    if (peek().type === TokenType.LPAREN) {
      return parseFunctionDecl(dtype, name, line);
    }

    // Array declaration
    if (peek().type === TokenType.LBRACKET) {
      advance();
      const size = parseExpression();
      expect(TokenType.RBRACKET, "Expected ']'");
      let init = null;
      if (match(TokenType.ASSIGN)) {
        init = parseArrayInit();
      }
      expect(TokenType.SEMICOLON, "Expected ';'");
      return { type: 'ArrayDecl', dataType: dtype.value, name: name.value, size, init, line };
    }

    // Variable declaration
    let init = null;
    if (match(TokenType.ASSIGN)) {
      init = parseExpression();
    }
    expect(TokenType.SEMICOLON, "Expected ';' after variable declaration");
    return { type: 'VarDecl', dataType: dtype.value, name: name.value, init, line };
  }

  function parseArrayInit() {
    expect(TokenType.LBRACE, "Expected '{' for array initializer");
    const elements = [];
    if (peek().type !== TokenType.RBRACE) {
      elements.push(parseExpression());
      while (match(TokenType.COMMA)) {
        elements.push(parseExpression());
      }
    }
    expect(TokenType.RBRACE, "Expected '}'");
    return elements;
  }

  function parseFunctionDecl(dtype, name, line) {
    expect(TokenType.LPAREN);
    const params = [];
    if (peek().type !== TokenType.RPAREN) {
      do {
        const pType = advance();
        const pName = expect(TokenType.IDENTIFIER, 'Expected parameter name');
        params.push({ dataType: pType.value, name: pName.value });
      } while (match(TokenType.COMMA));
    }
    expect(TokenType.RPAREN, "Expected ')'");
    const body = parseBlock();
    return { type: 'FunctionDecl', dataType: dtype.value, name: name.value, params, body, line };
  }

  function parseBlock() {
    const line = peek().line;
    expect(TokenType.LBRACE, "Expected '{'");
    const stmts = [];
    while (peek().type !== TokenType.RBRACE && peek().type !== TokenType.EOF) {
      stmts.push(parseStatement());
    }
    expect(TokenType.RBRACE, "Expected '}'");
    return { type: 'Block', body: stmts, line };
  }

  function parseStatement() {
    const t = peek();

    if (t.type === TokenType.CONST) return parseConstDecl();
    if (isType(t.type)) return parseLocalDecl();
    if (t.type === TokenType.IF) return parseIf();
    if (t.type === TokenType.WHILE) return parseWhile();
    if (t.type === TokenType.FOR) return parseFor();
    if (t.type === TokenType.REPEAT) return parseRepeat();
    if (t.type === TokenType.FOREACH) return parseForeach();
    if (t.type === TokenType.RANGE) return parseRange();
    if (t.type === TokenType.RETURN) return parseReturn();
    if (t.type === TokenType.SHOW) return parseShow();
    if (t.type === TokenType.LBRACE) return parseBlock();

    return parseExpressionStatement();
  }

  function parseShow() {
    const line = peek().line;
    expect(TokenType.SHOW);
    expect(TokenType.LPAREN, "Expected '(' after 'show'");
    const args = [];
    args.push(parseExpression());
    while (match(TokenType.COMMA)) {
      args.push(parseExpression());
    }
    expect(TokenType.RPAREN, "Expected ')' after show arguments");
    expect(TokenType.SEMICOLON, "Expected ';' after show statement");
    return { type: 'ShowStatement', args, line };
  }

  function parseLocalDecl() {
    const line = peek().line;
    const dtype = advance();
    const name = expect(TokenType.IDENTIFIER, 'Expected identifier');

    if (peek().type === TokenType.LBRACKET) {
      advance();
      const size = parseExpression();
      expect(TokenType.RBRACKET, "Expected ']'");
      let init = null;
      if (match(TokenType.ASSIGN)) init = parseArrayInit();
      expect(TokenType.SEMICOLON, "Expected ';'");
      return { type: 'ArrayDecl', dataType: dtype.value, name: name.value, size, init, line };
    }

    let init = null;
    if (match(TokenType.ASSIGN)) init = parseExpression();
    expect(TokenType.SEMICOLON, "Expected ';'");
    return { type: 'VarDecl', dataType: dtype.value, name: name.value, init, line };
  }

  function parseIf() {
    const line = peek().line;
    expect(TokenType.IF);
    expect(TokenType.LPAREN, "Expected '(' after 'if'");
    const condition = parseExpression();
    expect(TokenType.RPAREN, "Expected ')'");
    const consequent = parseStatement();
    let alternate = null;
    if (match(TokenType.ELSE)) alternate = parseStatement();
    return { type: 'IfStatement', condition, consequent, alternate, line };
  }

  function parseWhile() {
    const line = peek().line;
    expect(TokenType.WHILE);
    expect(TokenType.LPAREN, "Expected '(' after 'while'");
    const condition = parseExpression();
    expect(TokenType.RPAREN, "Expected ')'");
    const body = parseStatement();
    return { type: 'WhileStatement', condition, body, line };
  }

  function parseFor() {
    const line = peek().line;
    expect(TokenType.FOR);
    expect(TokenType.LPAREN, "Expected '(' after 'for'");
    let init = null;
    if (peek().type !== TokenType.SEMICOLON) {
      if (isType(peek().type)) {
        const dtype = advance();
        const name = expect(TokenType.IDENTIFIER);
        let initVal = null;
        if (match(TokenType.ASSIGN)) initVal = parseExpression();
        init = { type: 'VarDecl', dataType: dtype.value, name: name.value, init: initVal, line };
      } else {
        init = parseExpression();
      }
    }
    expect(TokenType.SEMICOLON, "Expected ';' in for loop");
    let condition = null;
    if (peek().type !== TokenType.SEMICOLON) condition = parseExpression();
    expect(TokenType.SEMICOLON, "Expected ';' in for loop");
    let update = null;
    if (peek().type !== TokenType.RPAREN) update = parseExpression();
    expect(TokenType.RPAREN, "Expected ')'");
    const body = parseStatement();
    return { type: 'ForStatement', init, condition, update, body, line };
  }

  function parseRepeat() {
    const line = peek().line;
    expect(TokenType.REPEAT);
    expect(TokenType.LPAREN, "Expected '(' after 'repeat'");
    const count = parseExpression();
    expect(TokenType.RPAREN, "Expected ')'");
    const body = parseStatement();
    return { type: 'RepeatStatement', count, body, line };
  }

  function parseForeach() {
    const line = peek().line;
    expect(TokenType.FOREACH);
    expect(TokenType.LPAREN, "Expected '(' after 'foreach'");
    const varName = expect(TokenType.IDENTIFIER, "Expected variable name in foreach");
    expect(TokenType.IN, "Expected 'in' keyword in foreach");
    const arrayName = expect(TokenType.IDENTIFIER, "Expected array name in foreach");
    expect(TokenType.RPAREN, "Expected ')'");
    const body = parseStatement();
    return { type: 'ForeachStatement', variable: varName.value, array: arrayName.value, body, line };
  }

  function parseRange() {
    const line = peek().line;
    expect(TokenType.RANGE);
    expect(TokenType.LPAREN, "Expected '(' after 'range'");
    const varName = expect(TokenType.IDENTIFIER, "Expected variable name in range");
    expect(TokenType.COMMA, "Expected ',' after variable in range");
    const start = parseExpression();
    expect(TokenType.COMMA, "Expected ',' after start in range");
    const end = parseExpression();
    expect(TokenType.RPAREN, "Expected ')'");
    const body = parseStatement();
    return { type: 'RangeStatement', variable: varName.value, start, end, body, line };
  }

  function parseReturn() {
    const line = peek().line;
    expect(TokenType.RETURN);
    let value = null;
    if (peek().type !== TokenType.SEMICOLON) value = parseExpression();
    expect(TokenType.SEMICOLON, "Expected ';' after return");
    return { type: 'ReturnStatement', value, line };
  }

  function parseExpressionStatement() {
    const line = peek().line;
    const expr = parseExpression();
    expect(TokenType.SEMICOLON, "Expected ';' after expression");
    return { type: 'ExpressionStatement', expression: expr, line };
  }

  // Expression parsing with precedence
  function parseExpression() {
    return parseAssignment();
  }

  function parseAssignment() {
    const left = parseOr();
    const t = peek();
    if (t.type === TokenType.ASSIGN || t.type === TokenType.PLUS_ASSIGN ||
        t.type === TokenType.MINUS_ASSIGN || t.type === TokenType.STAR_ASSIGN ||
        t.type === TokenType.SLASH_ASSIGN) {
      const op = advance();
      const right = parseAssignment();
      return { type: 'Assignment', operator: op.value, left, right, line: op.line };
    }
    return left;
  }

  function parseOr() {
    let left = parseAnd();
    while (peek().type === TokenType.OR) {
      const op = advance();
      const right = parseAnd();
      left = { type: 'BinaryExpr', operator: op.value, left, right, line: op.line };
    }
    return left;
  }

  function parseAnd() {
    let left = parseEquality();
    while (peek().type === TokenType.AND) {
      const op = advance();
      const right = parseEquality();
      left = { type: 'BinaryExpr', operator: op.value, left, right, line: op.line };
    }
    return left;
  }

  function parseEquality() {
    let left = parseComparison();
    while (peek().type === TokenType.EQ || peek().type === TokenType.NEQ) {
      const op = advance();
      const right = parseComparison();
      left = { type: 'BinaryExpr', operator: op.value, left, right, line: op.line };
    }
    return left;
  }

  function parseComparison() {
    let left = parseAddSub();
    while (peek().type === TokenType.LT || peek().type === TokenType.GT ||
           peek().type === TokenType.LTE || peek().type === TokenType.GTE) {
      const op = advance();
      const right = parseAddSub();
      left = { type: 'BinaryExpr', operator: op.value, left, right, line: op.line };
    }
    return left;
  }

  function parseAddSub() {
    let left = parseMulDiv();
    while (peek().type === TokenType.PLUS || peek().type === TokenType.MINUS) {
      const op = advance();
      const right = parseMulDiv();
      left = { type: 'BinaryExpr', operator: op.value, left, right, line: op.line };
    }
    return left;
  }

  function parseMulDiv() {
    let left = parseUnary();
    while (peek().type === TokenType.STAR || peek().type === TokenType.SLASH || peek().type === TokenType.PERCENT) {
      const op = advance();
      const right = parseUnary();
      left = { type: 'BinaryExpr', operator: op.value, left, right, line: op.line };
    }
    return left;
  }

  function parseUnary() {
    if (peek().type === TokenType.MINUS || peek().type === TokenType.NOT) {
      const op = advance();
      const operand = parseUnary();
      return { type: 'UnaryExpr', operator: op.value, operand, line: op.line };
    }
    if (peek().type === TokenType.INCREMENT || peek().type === TokenType.DECREMENT) {
      const op = advance();
      const operand = parsePostfix();
      return { type: 'PrefixExpr', operator: op.value, operand, line: op.line };
    }
    return parsePostfix();
  }

  function parsePostfix() {
    let expr = parsePrimary();
    while (true) {
      if (peek().type === TokenType.LBRACKET) {
        advance();
        const index = parseExpression();
        expect(TokenType.RBRACKET, "Expected ']'");
        expr = { type: 'ArrayAccess', array: expr, index, line: expr.line };
      } else if (peek().type === TokenType.LPAREN) {
        advance();
        const args = [];
        if (peek().type !== TokenType.RPAREN) {
          args.push(parseExpression());
          while (match(TokenType.COMMA)) args.push(parseExpression());
        }
        expect(TokenType.RPAREN, "Expected ')'");
        expr = { type: 'FunctionCall', callee: expr, args, line: expr.line };
      } else if (peek().type === TokenType.INCREMENT || peek().type === TokenType.DECREMENT) {
        const op = advance();
        expr = { type: 'PostfixExpr', operator: op.value, operand: expr, line: op.line };
      } else {
        break;
      }
    }
    return expr;
  }

  function parsePrimary() {
    const t = peek();
    if (t.type === TokenType.INT_LITERAL) { advance(); return { type: 'IntLiteral', value: t.value, line: t.line }; }
    if (t.type === TokenType.FLOAT_LITERAL) { advance(); return { type: 'FloatLiteral', value: t.value, line: t.line }; }
    if (t.type === TokenType.CHAR_LITERAL) { advance(); return { type: 'CharLiteral', value: t.value, line: t.line }; }
    if (t.type === TokenType.STRING_LITERAL) { advance(); return { type: 'StringLiteral', value: t.value, line: t.line }; }
    if (t.type === TokenType.IDENTIFIER) { advance(); return { type: 'Identifier', name: t.value, line: t.line }; }
    if (t.type === TokenType.LPAREN) {
      advance();
      const expr = parseExpression();
      expect(TokenType.RPAREN, "Expected ')'");
      return expr;
    }
    errors.push({ message: `Unexpected token '${t.value}'`, line: t.line, col: t.col });
    advance();
    return { type: 'Error', line: t.line };
  }

  const ast = parseProgram();
  return { ast, errors };
}
