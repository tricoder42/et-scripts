#!/usr/bin/env node

const program = require("commander")

// Errors in promises should be fatal.
let loggedErrors = new Set()
process.on("unhandledRejection", err => {
  if (loggedErrors.has(err)) {
    // No need to print it twice.
    process.exit(1)
  }

  if (err.stderr) {
    console.error(err.stderr)
  } else {
    console.error(err)
  }

  throw err
})

program
  .command("test")
  .description(
    "Run jest test runner. Passes through all flags directly to Jest"
  )
  .action(require("./commands/test"))

program
  .command("build [packages...]")
  .description("Build all packages")
  .action(require("./commands/build"))

program
  .command("release")
  .option("--dev", "Publish pre-release")
  .description("Publish packages")
  .action(require("./commands/release"))

program.parse(process.argv)
