#!/usr/bin/env node

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * ============================================================================
 * Design Rationale: CLI Entry Point - "delivr" Command
 * ============================================================================
 * 
 * PURPOSE:
 * 
 * This is THE ENTRY POINT for the Delivr CLI. When developers run:
 * ```bash
 * delivr release-react -a MyApp -d Production
 * ```
 * 
 * This file is executed (via the shebang #!/usr/bin/env node).
 * 
 * RESPONSIBILITIES:
 * 1. Parse command-line arguments → command-parser.ts
 * 2. Execute parsed command → command-executor.ts
 * 3. Handle errors gracefully (red error messages, exit code 1)
 * 
 * DESIGN DECISION: MINIMAL ENTRY POINT
 * 
 * Why keep this file tiny (< 30 lines)?
 * - Separation of concerns:
 *   - cli.ts: Entry point (orchestration only)
 *   - command-parser.ts: Argument validation (100+ lines)
 *   - command-executor.ts: Business logic (1700+ lines)
 * - Testability: Can test parser and executor independently
 * - Maintainability: Easy to understand flow at a glance
 * 
 * FLOW:
 * 
 * 1. User runs: `delivr release-react -a MyApp -d Production`
 * 2. Node.js executes this file (shebang #!/usr/bin/env node)
 * 3. parser.createCommand() parses argv:
 *    ```typescript
 *    {
 *      type: "release-react",
 *      appName: "MyApp",
 *      deploymentName: "Production",
 *      platform: "ios",  // default
 *      // ... other flags
 *    }
 *    ```
 * 4. execute.execute(command) runs releaseReact() in command-executor.ts
 * 5. Success → exit code 0
 *    Failure → catch block → red error message → exit code 1
 * 
 * ERROR HANDLING:
 * 
 * All errors bubble up to this catch block:
 * ```typescript
 * .catch((error: any): void => {
 *   console.error(chalk.red(`[Error]  ${error.message}`));
 *   process.exit(1);  // Non-zero exit code for CI/CD
 * })
 * ```
 * 
 * Why exit(1) matters:
 * - CI/CD scripts check exit code: 0 = success, non-zero = failure
 * - Without exit(1), errors would be silent in CI pipelines
 * 
 * Example CI script:
 * ```bash
 * delivr release-react -a MyApp -d Production
 * if [ $? -ne 0 ]; then
 *   echo "Release failed, aborting deployment"
 *   exit 1
 * fi
 * ```
 * 
 * SHEBANG: #!/usr/bin/env node
 * 
 * What it does:
 * - Tells OS: "Run this file with node interpreter"
 * - Allows CLI to be executable: chmod +x cli.ts
 * - User can run: `delivr` (not `node delivr`)
 * 
 * package.json integration:
 * ```json
 * {
 *   "bin": {
 *     "delivr": "./bin/script/cli.js"  // Compiled from cli.ts
 *   }
 * }
 * ```
 * - npm install creates symlink: /usr/local/bin/delivr → node_modules/.bin/delivr
 * - User can run `delivr` from anywhere in terminal
 * 
 * ALTERNATIVES CONSIDERED:
 * 
 * 1. Inline all logic in cli.ts (no parser/executor split)
 *    - Rejected: 2000+ lines in one file, hard to maintain
 * 
 * 2. Use CLI framework (e.g., Commander.js, yargs)
 *    - Rejected: Microsoft CodePush used custom parser, legacy compatibility
 *    - Note: Modern approach would use Commander.js
 * 
 * 3. No error handling (let Node.js handle errors)
 *    - Rejected: Ugly error output, no user-friendly messages
 * 
 * LESSON LEARNED: SIMPLE ENTRY POINTS ARE GOOD
 * 
 * Benefits of minimal entry point:
 * - Easy to understand at a glance
 * - Clear separation: parsing vs. execution
 * - Testable components (mock parser/executor separately)
 * 
 * RELATED FILES:
 * 
 * - command-parser.ts: Parses argv, validates arguments
 * - command-executor.ts: Implements all CLI commands (release, deploy, etc.)
 * - delivr-cli.ts: Alternative entry point for programmatic use
 * 
 * ============================================================================
 */

import * as parser from "./command-parser";
import * as execute from "./command-executor";
import * as chalk from "chalk";

function run() {
  const command = parser.createCommand();

  if (!command) {
    parser.showHelp(/*showRootDescription*/ false);
    return;
  }

  execute
    .execute(command)
    .catch((error: any): void => {
      console.error(chalk.red(`[Error]  ${error.message}`));
      process.exit(1);
    })
    .done();
}

run();
