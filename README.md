# Tiny Stack VM

[![make.fun · tiny-stack-vm-01-run-20261122](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/baijorl21/tiny-stack-vm-01-run-20261122/rank.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)
[![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/baijorl21/tiny-stack-vm-01-run-20261122/reward.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)

Entry for the [tiny-stack-vm-01-run-20261122 bounty](https://make.fun/c/tiny-stack-vm-01-run-20261122): a complete interpreter for make.fun's tiny stack ISA v1 in one file — all 37 opcodes, 32-bit wrapping arithmetic, 256-deep stack, 64-deep call stack, 256 memory words, 1,000,000-step and 65,536-byte output limits, and every trap (codes 2-11) ending the run at once with its own exit code while keeping prior output. Deterministic, Node builtins only.

## Run it

```
mkdir -p out && MAKEFUN_INPUT_DIR=<practice/input> MAKEFUN_OUTPUT_DIR=out node main.ts
```

Answers every instance in one run, writing `<id>/stdout.bin` and `<id>/exit.txt` each.
