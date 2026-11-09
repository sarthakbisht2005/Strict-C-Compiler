# StrictC

StrictC is a browser-based educational compiler for a small, C-like language. It demonstrates how source code moves through the major stages of compilation, from lexical and syntax analysis to semantic checks, intermediate code, and x86 NASM assembly generation.

The language supports familiar constructs such as `int`, `float`, and `char` variables, functions, conditionals, and loops, along with extended `repeat`, `foreach`, and `range` loops. The `show()` construct provides a simple way to represent output in example programs.

## Features

- Tokenizes source code and reports lexer errors with line and column information.
- Parses programs into an abstract syntax tree (AST).
- Performs semantic analysis, including identifier and type checks, and displays a symbol table.
- Generates three-address intermediate representation (IR).
- Generates x86 NASM assembly text for supported programs.
- Provides a browser-based code editor with sample programs and separate views for tokens, AST, symbol table, IR, assembly, and errors.
- Allows generated assembly to be downloaded as `output.asm`.

StrictC is a learning project and supports a subset of C; it is not a full C compiler. The web application displays generated assembly and does not execute it.

## Run locally

Requirements: Node.js and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite, enter or select a sample program, and choose **Compile**.

## Other commands

```sh
npm run build
npm test
npm run lint
```
