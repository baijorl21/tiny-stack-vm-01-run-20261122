// Tiny stack VM for make.fun's ISA v1: 32-bit wrapping ints, 256-deep stack,
// 64-deep call stack, 256 memory words, 1e6 steps, 65536 output bytes.
// Each trap ends the run with its own exit code, keeping prior output.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Valid opcodes: 0-7, 16-30, 32-34, 48-52, 64-65, 80-83.
const K = (o) => o <= 7 || (o >= 16 && o <= 30) || (o >= 32 && o <= 34) || (o >= 48 && o <= 52) || o === 64 || o === 65 || (o >= 80 && o <= 83);
const IM = (o) => (o === 1 ? 1 : o === 2 ? 4 : o >= 48 && o <= 51 ? 2 : 0);
const PO = (o) => (o === 7 ? 3 : o === 0 || o === 1 || o === 2 || o === 48 || o === 51 || o === 52 || o === 82 ? 0 : o === 3 || o === 4 || o === 23 || o === 27 || o === 49 || o === 50 || o === 64 || o === 80 || o === 81 || o === 83 ? 1 : 2);
const PU = (o) => (o === 4 || o === 5 ? 2 : o === 6 || o === 7 ? 3 : o === 0 || o === 3 || (o >= 48 && o <= 52) || o === 65 || o === 80 || o === 81 || o === 83 ? 0 : 1);

function runVM(prog, inp) {
  const n = prog.length, il = inp.length;
  const st = new Int32Array(256), cs = new Int32Array(64), mem = new Int32Array(256);
  const out = new Uint8Array(65536);
  let sp = 0, csp = 0, olen = 0, ip = 0, pc = 0, steps = 0;
  const fin = (code) => ({ buf: out.slice(0, olen), code });
  for (;;) {
    if (steps === 1000000) return fin(10);
    if (pc < 0 || pc >= n) return fin(9);
    const op = prog[pc];
    if (!K(op)) return fin(5);
    const imm = IM(op);
    if (pc + imm >= n) return fin(9);
    steps++;
    const nxt = pc + 1 + imm, pops = PO(op);
    if (sp < pops) return fin(2);
    if (sp - pops + PU(op) > 256) return fin(3);
    pc = nxt;
    switch (op) {
      case 0: return fin(0);
      case 1: st[sp++] = (prog[nxt - 1] << 24) >> 24; break;
      case 2: st[sp++] = prog[nxt - 4] | (prog[nxt - 3] << 8) | (prog[nxt - 2] << 16) | (prog[nxt - 1] << 24); break;
      case 3: sp--; break;
      case 4: st[sp] = st[sp - 1]; sp++; break;
      case 5: { const t = st[sp - 1]; st[sp - 1] = st[sp - 2]; st[sp - 2] = t; break; }
      case 6: st[sp] = st[sp - 2]; sp++; break;
      case 7: { const a = st[sp - 3]; st[sp - 3] = st[sp - 2]; st[sp - 2] = st[sp - 1]; st[sp - 1] = a; break; }
      case 23: st[sp - 1] = -st[sp - 1] | 0; break;
      case 27: st[sp - 1] = ~st[sp - 1]; break;
      case 16: case 17: case 18: case 19: case 20: case 21: case 22:
      case 24: case 25: case 26: case 28: case 29: case 30:
      case 32: case 33: case 34: {
        const b = st[sp - 1], a = st[sp - 2];
        let r;
        if (op === 16) r = (a + b) | 0;
        else if (op === 17) r = (a - b) | 0;
        else if (op === 18) r = Math.imul(a, b);
        else if (op === 19) { if (b === 0) return fin(4); r = a === -2147483648 && b === -1 ? a : (a / b) | 0; }
        else if (op === 20) { if (b === 0) return fin(4); r = b === -1 ? 0 : (a % b) | 0; }
        else if (op === 21) { if (b === 0) return fin(4); r = Math.floor((a >>> 0) / (b >>> 0)) | 0; }
        else if (op === 22) { if (b === 0) return fin(4); r = ((a >>> 0) % (b >>> 0)) | 0; }
        else if (op === 24) r = a & b;
        else if (op === 25) r = a | b;
        else if (op === 26) r = a ^ b;
        else if (op === 28) r = a << (b & 31);
        else if (op === 29) r = a >> (b & 31);
        else if (op === 30) r = (a >>> (b & 31)) | 0;
        else if (op === 32) r = a === b ? 1 : 0;
        else if (op === 33) r = a < b ? 1 : 0;
        else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
        sp -= 2; st[sp++] = r;
        break;
      }
      case 48: case 49: case 50: {
        const rel = ((prog[nxt - 2] | (prog[nxt - 1] << 8)) << 16) >> 16;
        let take = true;
        if (op !== 48) { const v = st[--sp]; take = op === 49 ? v === 0 : v !== 0; }
        if (take) pc = nxt + rel;
        break;
      }
      case 51:
        if (csp === 64) return fin(7);
        cs[csp++] = nxt;
        pc = prog[nxt - 2] | (prog[nxt - 1] << 8);
        break;
      case 52:
        if (csp === 0) return fin(8);
        pc = cs[--csp];
        break;
      case 64: {
        const addr = st[sp - 1];
        if (addr < 0 || addr >= 256) return fin(6);
        st[sp - 1] = mem[addr];
        break;
      }
      case 65: {
        const addr = st[sp - 1];
        if (addr < 0 || addr >= 256) return fin(6);
        mem[addr] = st[sp - 2];
        sp -= 2;
        break;
      }
      case 80: {
        const s = String(st[sp - 1]);
        if (olen + s.length > 65536) return fin(11);
        sp--;
        for (let i = 0; i < s.length; i++) out[olen++] = s.charCodeAt(i);
        break;
      }
      case 81:
        if (olen + 1 > 65536) return fin(11);
        out[olen++] = st[--sp] & 255;
        break;
      case 82: st[sp++] = ip < il ? inp[ip++] : -1; break;
      case 83: return fin(st[--sp] & 255);
    }
  }
}

const IN_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const e of readdirSync(IN_DIR, { withFileTypes: true })) {
  if (!e.isDirectory()) continue;
  const id = e.name;
  const r = runVM(new Uint8Array(readFileSync(join(IN_DIR, id, 'program.bin'))), new Uint8Array(readFileSync(join(IN_DIR, id, 'input.bin'))));
  mkdirSync(join(OUT_DIR, id), { recursive: true });
  writeFileSync(join(OUT_DIR, id, 'stdout.bin'), r.buf);
  writeFileSync(join(OUT_DIR, id, 'exit.txt'), r.code + '\n');
}
