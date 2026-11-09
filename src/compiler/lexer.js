// StrictC Lexer - Hand-written tokenizer

export const TokenType = {
  // Keywords
  INT: 'INT', FLOAT: 'FLOAT', CHAR: 'CHAR',
  IF: 'IF', ELSE: 'ELSE', WHILE: 'WHILE', FOR: 'FOR',
  RETURN: 'RETURN', CONST: 'CONST', VOID: 'VOID',
  REPEAT: 'REPEAT', FOREACH: 'FOREACH', RANGE: 'RANGE',
  IN: 'IN', SHOW: 'SHOW',
  // Literals
  INT_LITERAL: 'INT_LITERAL',
  FLOAT_LITERAL: 'FLOAT_LITERAL',
  CHAR_LITERAL: 'CHAR_LITERAL',
  STRING_LITERAL: 'STRING_LITERAL',
  // Identifiers
  IDENTIFIER: 'IDENTIFIER',
  // Operators
  PLUS: 'PLUS', MINUS: 'MINUS', STAR: 'STAR', SLASH: 'SLASH', PERCENT: 'PERCENT',
  ASSIGN: 'ASSIGN',
  EQ: 'EQ', NEQ: 'NEQ', LT: 'LT', GT: 'GT', LTE: 'LTE', GTE: 'GTE',
  AND: 'AND', OR: 'OR', NOT: 'NOT',
  INCREMENT: 'INCREMENT', DECREMENT: 'DECREMENT',
  PLUS_ASSIGN: 'PLUS_ASSIGN', MINUS_ASSIGN: 'MINUS_ASSIGN',
  STAR_ASSIGN: 'STAR_ASSIGN', SLASH_ASSIGN: 'SLASH_ASSIGN',
  // Delimiters
  LPAREN: 'LPAREN', RPAREN: 'RPAREN',
  LBRACE: 'LBRACE', RBRACE: 'RBRACE',
  LBRACKET: 'LBRACKET', RBRACKET: 'RBRACKET',
  SEMICOLON: 'SEMICOLON', COMMA: 'COMMA',
  // Special
  EOF: 'EOF',
};

const KEYWORDS = {
  'int': TokenType.INT,
  'float': TokenType.FLOAT,
  'char': TokenType.CHAR,
  'if': TokenType.IF,
  'else': TokenType.ELSE,
  'while': TokenType.WHILE,
  'for': TokenType.FOR,
  'return': TokenType.RETURN,
  'const': TokenType.CONST,
  'void': TokenType.VOID,
  'repeat': TokenType.REPEAT,
  'foreach': TokenType.FOREACH,
  'range': TokenType.RANGE,
  'in': TokenType.IN,
  'show': TokenType.SHOW,
};

export function tokenize(source) {
  const tokens = [];
  const errors = [];
  let pos = 0;
  let line = 1;
  let col = 1;

  function peek() { return pos < source.length ? source[pos] : '\0'; }
  function advance() {
    const ch = source[pos++];
    if (ch === '\n') { line++; col = 1; } else { col++; }
    return ch;
  }
  function peekNext() { return pos + 1 < source.length ? source[pos + 1] : '\0'; }

  function addToken(type, value) {
    tokens.push({ type, value, line, col: col - String(value).length });
  }

  while (pos < source.length) {
    const ch = peek();

    // Skip whitespace
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
      advance();
      continue;
    }

    // Single-line comments
    if (ch === '/' && peekNext() === '/') {
      while (pos < source.length && peek() !== '\n') advance();
      continue;
    }

    // Multi-line comments
    if (ch === '/' && peekNext() === '*') {
      advance(); advance();
      while (pos < source.length) {
        if (peek() === '*' && peekNext() === '/') {
          advance(); advance();
          break;
        }
        advance();
      }
      continue;
    }

    // Char literals
    if (ch === '\'') {
      const startLine = line, startCol = col;
      advance();
      let charVal = '';
      if (peek() === '\\') {
        advance();
        const esc = advance();
        const escMap = { 'n': '\n', 't': '\t', '\\': '\\', '\'': '\'', '0': '\0' };
        charVal = escMap[esc] || esc;
      } else {
        charVal = advance();
      }
      if (peek() === '\'') {
        advance();
        tokens.push({ type: TokenType.CHAR_LITERAL, value: charVal, line: startLine, col: startCol });
      } else {
        errors.push({ message: `Unterminated character literal`, line: startLine, col: startCol });
      }
      continue;
    }

    // String literals
    if (ch === '"') {
      const startLine = line, startCol = col;
      advance();
      let str = '';
      while (pos < source.length && peek() !== '"' && peek() !== '\n') {
        if (peek() === '\\') {
          advance();
          const esc = advance();
          const escMap = { 'n': '\n', 't': '\t', '\\': '\\', '"': '"', '0': '\0' };
          str += escMap[esc] || esc;
        } else {
          str += advance();
        }
      }
      if (peek() === '"') {
        advance();
        tokens.push({ type: TokenType.STRING_LITERAL, value: str, line: startLine, col: startCol });
      } else {
        errors.push({ message: `Unterminated string literal`, line: startLine, col: startCol });
      }
      continue;
    }

    // Numbers
    if (ch >= '0' && ch <= '9') {
      const startCol = col;
      let num = '';
      let isFloat = false;
      while (pos < source.length && ((peek() >= '0' && peek() <= '9') || peek() === '.')) {
        if (peek() === '.') {
          if (isFloat) break;
          isFloat = true;
        }
        num += advance();
      }
      tokens.push({
        type: isFloat ? TokenType.FLOAT_LITERAL : TokenType.INT_LITERAL,
        value: isFloat ? parseFloat(num) : parseInt(num, 10),
        line, col: startCol
      });
      continue;
    }

    // Identifiers and keywords
    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_') {
      const startCol = col;
      let id = '';
      while (pos < source.length && ((peek() >= 'a' && peek() <= 'z') || (peek() >= 'A' && peek() <= 'Z') || (peek() >= '0' && peek() <= '9') || peek() === '_')) {
        id += advance();
      }
      const type = KEYWORDS[id] || TokenType.IDENTIFIER;
      tokens.push({ type, value: id, line, col: startCol });
      continue;
    }

    // Operators and delimiters
    const startCol = col;
    switch (ch) {
      case '+':
        advance();
        if (peek() === '+') { advance(); addToken(TokenType.INCREMENT, '++'); }
        else if (peek() === '=') { advance(); addToken(TokenType.PLUS_ASSIGN, '+='); }
        else addToken(TokenType.PLUS, '+');
        break;
      case '-':
        advance();
        if (peek() === '-') { advance(); addToken(TokenType.DECREMENT, '--'); }
        else if (peek() === '=') { advance(); addToken(TokenType.MINUS_ASSIGN, '-='); }
        else addToken(TokenType.MINUS, '-');
        break;
      case '*':
        advance();
        if (peek() === '=') { advance(); addToken(TokenType.STAR_ASSIGN, '*='); }
        else addToken(TokenType.STAR, '*');
        break;
      case '/':
        advance();
        if (peek() === '=') { advance(); addToken(TokenType.SLASH_ASSIGN, '/='); }
        else addToken(TokenType.SLASH, '/');
        break;
      case '%': advance(); addToken(TokenType.PERCENT, '%'); break;
      case '=':
        advance();
        if (peek() === '=') { advance(); addToken(TokenType.EQ, '=='); }
        else addToken(TokenType.ASSIGN, '=');
        break;
      case '!':
        advance();
        if (peek() === '=') { advance(); addToken(TokenType.NEQ, '!='); }
        else addToken(TokenType.NOT, '!');
        break;
      case '<':
        advance();
        if (peek() === '=') { advance(); addToken(TokenType.LTE, '<='); }
        else addToken(TokenType.LT, '<');
        break;
      case '>':
        advance();
        if (peek() === '=') { advance(); addToken(TokenType.GTE, '>='); }
        else addToken(TokenType.GT, '>');
        break;
      case '&':
        advance();
        if (peek() === '&') { advance(); addToken(TokenType.AND, '&&'); }
        else errors.push({ message: `Unexpected character '&'. Did you mean '&&'?`, line, col: startCol });
        break;
      case '|':
        advance();
        if (peek() === '|') { advance(); addToken(TokenType.OR, '||'); }
        else errors.push({ message: `Unexpected character '|'. Did you mean '||'?`, line, col: startCol });
        break;
      case '(': advance(); addToken(TokenType.LPAREN, '('); break;
      case ')': advance(); addToken(TokenType.RPAREN, ')'); break;
      case '{': advance(); addToken(TokenType.LBRACE, '{'); break;
      case '}': advance(); addToken(TokenType.RBRACE, '}'); break;
      case '[': advance(); addToken(TokenType.LBRACKET, '['); break;
      case ']': advance(); addToken(TokenType.RBRACKET, ']'); break;
      case ';': advance(); addToken(TokenType.SEMICOLON, ';'); break;
      case ',': advance(); addToken(TokenType.COMMA, ','); break;
      default:
        errors.push({ message: `Unexpected character '${ch}'`, line, col });
        advance();
    }
  }

  tokens.push({ type: TokenType.EOF, value: 'EOF', line, col });
  return { tokens, errors };
}
