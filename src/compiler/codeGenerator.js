// StrictC Code Generator - x86 NASM Assembly (Windows)

export function generateAssembly(ir, symbolTable) {
  const lines = [];
  const dataSection = [];
  const bssSection = [];
  const textLines = [];
  let stackOffset = 0;
  const varOffsets = {};
  const stringLiterals = {};
  let stringCount = 0;
  let needsPrintf = false;

  // Collect string literals from IR
  ir.forEach(instr => {
    [instr.arg1, instr.arg2, instr.result].forEach(val => {
      if (typeof val === 'string' && val.startsWith('"') && !stringLiterals[val]) {
        const label = `_str${stringCount++}`;
        stringLiterals[val] = label;
      }
    });
  });

  function isNumber(v) { return /^-?\d+(\.\d+)?$/.test(v); }
  function isTemp(v) { return /^t\d+$/.test(v); }
  function isVar(v) { return typeof v === 'string' && v.length > 0 && !isNumber(v) && !v.startsWith('"') && !v.startsWith("'"); }

  function getOperand(v) {
    if (!v || v === '') return '0';
    if (isNumber(v)) return v;
    if (v.startsWith("'")) return String(v.charCodeAt(1) || 0);
    if (v.startsWith('"') && stringLiterals[v]) return stringLiterals[v];
    if (varOffsets[v] !== undefined) return `[ebp-${varOffsets[v]}]`;
    // Allocate stack space for new variable
    stackOffset += 4;
    varOffsets[v] = stackOffset;
    return `[ebp-${varOffsets[v]}]`;
  }

  function emitText(line) { textLines.push('    ' + line); }
  function emitLabel(label) { textLines.push(label + ':'); }

  let inFunction = false;

  for (let i = 0; i < ir.length; i++) {
    const instr = ir[i];
    const { op, arg1, arg2, result } = instr;

    switch (op) {
      case 'FUNC_BEGIN': {
        inFunction = true;
        stackOffset = 0;
        Object.keys(varOffsets).forEach(k => delete varOffsets[k]);
        textLines.push('');
        textLines.push(`global _${arg1}`);
        emitLabel(`_${arg1}`);
        emitText('push ebp');
        emitText('mov ebp, esp');
        emitText('; stack space reserved below');
        break;
      }

      case 'PARAM': {
        stackOffset += 4;
        varOffsets[result] = stackOffset;
        break;
      }

      case 'FUNC_END': {
        // Patch stack allocation
        const subIdx = textLines.findIndex(l => l.includes('; stack space reserved below'));
        if (subIdx >= 0) {
          const aligned = Math.ceil(stackOffset / 16) * 16 || 16;
          textLines[subIdx] = `    sub esp, ${aligned}`;
        }
        emitText('mov esp, ebp');
        emitText('pop ebp');
        emitText('ret');
        inFunction = false;
        break;
      }

      case 'DECLARE':
      case 'CONST_DECLARE': {
        stackOffset += 4;
        varOffsets[result] = stackOffset;
        break;
      }

      case 'ARRAY_DECLARE': {
        const size = isNumber(arg2) ? parseInt(arg2) : 10;
        const bytes = size * 4;
        stackOffset += bytes;
        varOffsets[result] = stackOffset;
        break;
      }

      case 'ASSIGN': {
        const src = getOperand(arg1);
        const dst = getOperand(result);
        if (isNumber(arg1)) {
          emitText(`mov dword ${dst}, ${arg1}`);
        } else {
          emitText(`mov eax, ${src}`);
          emitText(`mov ${dst}, eax`);
        }
        break;
      }

      case 'ADD': case 'SUB': case 'MUL': {
        const opMap = { ADD: 'add', SUB: 'sub', MUL: 'imul' };
        const a = getOperand(arg1);
        const b = getOperand(arg2);
        const dst = getOperand(result);
        if (isNumber(arg1)) emitText(`mov eax, ${arg1}`);
        else emitText(`mov eax, ${a}`);
        if (isNumber(arg2)) {
          if (op === 'MUL') { emitText(`mov ebx, ${arg2}`); emitText(`imul eax, ebx`); }
          else emitText(`${opMap[op]} eax, ${arg2}`);
        } else {
          if (op === 'MUL') emitText(`imul eax, ${b}`);
          else emitText(`${opMap[op]} eax, ${b}`);
        }
        emitText(`mov ${dst}, eax`);
        break;
      }

      case 'DIV': case 'MOD': {
        const a = getOperand(arg1);
        const b = getOperand(arg2);
        const dst = getOperand(result);
        if (isNumber(arg1)) emitText(`mov eax, ${arg1}`);
        else emitText(`mov eax, ${a}`);
        emitText('cdq');
        if (isNumber(arg2)) { emitText(`mov ebx, ${arg2}`); emitText('idiv ebx'); }
        else emitText(`idiv dword ${b}`);
        emitText(`mov ${dst}, ${op === 'MOD' ? 'edx' : 'eax'}`);
        break;
      }

      case 'NEG': {
        const a = getOperand(arg1);
        const dst = getOperand(result);
        emitText(`mov eax, ${a}`);
        emitText('neg eax');
        emitText(`mov ${dst}, eax`);
        break;
      }

      case 'NOT': {
        const a = getOperand(arg1);
        const dst = getOperand(result);
        emitText(`mov eax, ${a}`);
        emitText('cmp eax, 0');
        emitText('sete al');
        emitText('movzx eax, al');
        emitText(`mov ${dst}, eax`);
        break;
      }

      case 'EQ': case 'NEQ': case 'LT': case 'GT': case 'LTE': case 'GTE': {
        const cmpMap = { EQ: 'sete', NEQ: 'setne', LT: 'setl', GT: 'setg', LTE: 'setle', GTE: 'setge' };
        const a = getOperand(arg1);
        const b = getOperand(arg2);
        const dst = getOperand(result);
        if (isNumber(arg1)) emitText(`mov eax, ${arg1}`);
        else emitText(`mov eax, ${a}`);
        if (isNumber(arg2)) { emitText(`mov ebx, ${arg2}`); emitText('cmp eax, ebx'); }
        else emitText(`cmp eax, ${b}`);
        emitText(`${cmpMap[op]} al`);
        emitText('movzx eax, al');
        emitText(`mov ${dst}, eax`);
        break;
      }

      case 'AND': {
        const a = getOperand(arg1);
        const b = getOperand(arg2);
        const dst = getOperand(result);
        emitText(`mov eax, ${a}`);
        emitText(`and eax, ${b}`);
        emitText(`mov ${dst}, eax`);
        break;
      }

      case 'OR': {
        const a = getOperand(arg1);
        const b = getOperand(arg2);
        const dst = getOperand(result);
        emitText(`mov eax, ${a}`);
        emitText(`or eax, ${b}`);
        emitText(`mov ${dst}, eax`);
        break;
      }

      case 'IF_FALSE': {
        const cond = getOperand(arg1);
        if (isNumber(arg1)) emitText(`mov eax, ${arg1}`);
        else emitText(`mov eax, ${cond}`);
        emitText('cmp eax, 0');
        emitText(`je ${result}`);
        break;
      }

      case 'GOTO':
        emitText(`jmp ${result}`);
        break;

      case 'LABEL':
        emitLabel(result);
        break;

      case 'ARG': {
        const val = getOperand(arg1);
        if (isNumber(arg1)) emitText(`push dword ${arg1}`);
        else emitText(`push dword ${val}`);
        break;
      }

      case 'CALL': {
        const dst = getOperand(result);
        emitText(`call _${arg1}`);
        if (parseInt(arg2) > 0) emitText(`add esp, ${parseInt(arg2) * 4}`);
        emitText(`mov ${dst}, eax`);
        break;
      }

      case 'RETURN': {
        if (arg1 && arg1 !== '') {
          const val = getOperand(arg1);
          if (isNumber(arg1)) emitText(`mov eax, ${arg1}`);
          else emitText(`mov eax, ${val}`);
        } else {
          emitText('xor eax, eax');
        }
        emitText('mov esp, ebp');
        emitText('pop ebp');
        emitText('ret');
        break;
      }

      case 'ARRAY_STORE': {
        const arrBase = getOperand(arg1);
        const idx = getOperand(arg2);
        const val = getOperand(result);
        emitText(`lea ebx, ${arrBase}`);
        if (isNumber(arg2)) emitText(`mov ecx, ${arg2}`);
        else emitText(`mov ecx, ${idx}`);
        emitText('shl ecx, 2');
        emitText('add ebx, ecx');
        if (isNumber(result)) emitText(`mov dword [ebx], ${result}`);
        else { emitText(`mov eax, ${val}`); emitText('mov [ebx], eax'); }
        break;
      }

      case 'ARRAY_LOAD': {
        const arrBase = getOperand(arg1);
        const idx = getOperand(arg2);
        const dst = getOperand(result);
        emitText(`lea ebx, ${arrBase}`);
        if (isNumber(arg2)) emitText(`mov ecx, ${arg2}`);
        else emitText(`mov ecx, ${idx}`);
        emitText('shl ecx, 2');
        emitText('add ebx, ecx');
        emitText('mov eax, [ebx]');
        emitText(`mov ${dst}, eax`);
        break;
      }

      case 'ARRAY_LENGTH': {
        const sym = symbolTable.find(s => s.name === arg1);
        const dst = getOperand(result);
        const len = sym && sym.size ? (typeof sym.size === 'object' ? 10 : sym.size) : 10;
        emitText(`mov dword ${dst}, ${len}`);
        break;
      }

      case 'SHOW_INT': {
        needsPrintf = true;
        const val = getOperand(arg1);
        if (isNumber(arg1)) emitText(`push dword ${arg1}`);
        else { emitText(`mov eax, ${val}`); emitText('push eax'); }
        emitText('push dword _fmt_int');
        emitText('call _printf');
        emitText('add esp, 8');
        break;
      }

      case 'SHOW_STR': {
        needsPrintf = true;
        if (arg1.startsWith('"') && stringLiterals[arg1]) {
          emitText(`push dword ${stringLiterals[arg1]}`);
        } else {
          const val = getOperand(arg1);
          emitText(`push dword ${val}`);
        }
        emitText('push dword _fmt_str');
        emitText('call _printf');
        emitText('add esp, 8');
        break;
      }

      case 'SHOW_NEWLINE': {
        needsPrintf = true;
        emitText('push dword _fmt_nl');
        emitText('call _printf');
        emitText('add esp, 4');
        break;
      }

      default:
        emitText(`; unhandled IR: ${op} ${arg1} ${arg2} ${result}`);
    }
  }

  // Build final assembly
  lines.push('; StrictC Generated x86 NASM Assembly');
  lines.push('; Target: Windows x86 (32-bit)');
  lines.push('; Assemble: nasm -f win32 output.asm -o output.obj');
  lines.push('; Link:     gcc output.obj -o output.exe -lmsvcrt');
  lines.push('');

  if (needsPrintf) {
    lines.push('extern _printf');
    lines.push('');
  }

  lines.push('section .data');
  if (needsPrintf) {
    lines.push('    _fmt_int db "%d", 0');
    lines.push('    _fmt_str db "%s", 0');
    lines.push('    _fmt_nl  db 10, 0');
  }
  for (const [str, label] of Object.entries(stringLiterals)) {
    const cleaned = str.slice(1, -1).replace(/\\n/g, '", 10, "').replace(/\\t/g, '", 9, "');
    lines.push(`    ${label} db ${cleaned.length > 0 ? `"${cleaned}", 0` : '0'}`);
  }
  if (dataSection.length > 0) lines.push(...dataSection);

  lines.push('');
  lines.push('section .bss');
  if (bssSection.length > 0) lines.push(...bssSection);

  lines.push('');
  lines.push('section .text');
  lines.push(...textLines);

  return lines.join('\n');
}
