#!/usr/bin/env bun
/**
 * EVALS CLI Commands
 *
 * Command-line interface for the self-learning EVALS system
 */

import { EvalCommands } from "./evals-commands.js";

/**
 * Parse command-line arguments
 */
function parseArgs(args: string[]): {
  command: string;
  params: string[];
  flags: Map<string, string | boolean>;
} {
  const command = args[0] || "";
  const params: string[] = [];
  const flags = new Map<string, string | boolean>();

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const flagName = arg.slice(2);
      const nextArg = args[i + 1];

      if (nextArg && !nextArg.startsWith("--")) {
        flags.set(flagName, nextArg);
        i++; // Skip next arg as it's a value
      } else {
        flags.set(flagName, true);
      }
    } else {
      params.push(arg);
    }
  }

  return { command, params, flags };
}

/**
 * Main CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const { command, params, flags } = parseArgs(args);

  const commands = new EvalCommands();

  switch (command) {
    case "stats":
      await commands.stats();
      break;

    case "compare":
      if (params.length < 4) {
        console.error("\n❌ Invalid arguments");
        console.error("\nUsage: bun run evals compare <provider1> <model1> <provider2> <model2>");
        console.error('Example: bun run evals compare glm glm-4.7 anthropic claude-3-5-sonnet-20241022');
        process.exit(1);
      }
      await commands.compare(params[0], params[1], params[2], params[3]);
      break;

    case "route":
      if (params.length === 0) {
        console.error("\n❌ Missing query");
        console.error("\nUsage: bun run evals route \"your query here\"");
        console.error('Example: bun run evals route "Write a function to calculate fibonacci"');
        process.exit(1);
      }
      await commands.route(params.join(" "));
      break;

    case "reset":
      await commands.reset(flags.has("confirm"));
      break;

    case "export": {
      const format = (flags.get("format") as "json" | "yaml") || "json";
      const outputPath = params[0] || "./metrics.json";
      await commands.export(format, outputPath);
      break;
    }

    case "diagnose":
      await commands.diagnose();
      break;

    default:
      console.log(`
EVALS CLI - Self-Learning Evaluation System

Commands:
  stats                    Show performance statistics
  compare <p1> <m1> <p2> <m2>
                           Compare two providers
  route "query"            Show routing decision for query
  reset [--confirm]        Reset performance store
  export [--format json|yaml] [path]
                           Export metrics to file
  diagnose                 Run system diagnostics

Examples:
  bun run evals stats
  bun run evals compare glm glm-4.7 anthropic claude-3-5-sonnet-20241022
  bun run evals route "Write a function to calculate fibonacci"
  bun run evals reset --confirm
  bun run evals export --format json ./metrics.json
  bun run evals diagnose
      `);
      process.exit(0);
  }
}

// Run CLI
main().catch((error) => {
  console.error("\n❌ Error:", error instanceof Error ? error.message : error);
  process.exit(1);
});
