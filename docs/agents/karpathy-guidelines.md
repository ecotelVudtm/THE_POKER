# Karpathy Coding Guidelines (THE_POKER)

1. **Think Before Coding**: State assumptions, check constraints (Clean Architecture 4 layers, `accounts` collection only, server-authoritative game state), and design interfaces before writing implementation.
2. **Simplicity First**: Write the minimum clean code that satisfies the exact specification. Avoid speculative abstractions or unused dependencies.
3. **Surgical Changes**: Keep each module focused on a single responsibility. Never leak infrastructure concerns (`express`, `mongoose`, `socket.io`) into `domain/` or `application/`.
4. **Goal-Driven Execution**: Verify every core rule with automated unit tests (Hand Evaluator, Pot Calculator, Mini-Game Mastery Scaling) and type-check/build before finishing.
