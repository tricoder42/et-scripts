"use strict"

const { rollup } = require("rollup")
const babel = require("rollup-plugin-babel")
const { terser } = require("rollup-plugin-terser")
const commonjs = require("rollup-plugin-commonjs")
const resolve = require("rollup-plugin-node-resolve")
const autoExternal = require("rollup-plugin-auto-external")
const replace = require("rollup-plugin-replace")
const typescript = require("rollup-plugin-typescript2")
const ora = require("ora")
const chalk = require("chalk")
const path = require("path")
const fs = require("fs")
// const Stats = require("./stats")
// const sizes = require("./plugins/sizes")
const codeFrame = require("babel-code-frame")
const babelConfig = require("../../babel")

const NODE_DEV = "NODE_DEV"
const NODE_PROD = "NODE_PROD"

const extensions = [".js", ".ts", ".tsx"]

function getBabelConfig() {
  return Object.assign({}, babelConfig(), {
    babelrc: false,
    exclude: "node_modules/**",
    extensions,
    runtimeHelpers: true
  })
}

function getRollupOutputOptions(outputPath) {
  return {
    file: outputPath,
    format: "cjs",
    interop: true, // might be turned off with Babel 7, please review
    sourcemap: false
  }
}

function getFilename(pkg, bundleType) {
  const filename = pkg.path

  switch (bundleType) {
    case NODE_DEV:
      return path.join(pkg.getBuildDir(), "cjs", `${filename}.development.js`)
    case NODE_PROD:
      return path.join(
        pkg.getBuildDir(),
        "cjs",
        `${filename}.production.min.js`
      )
  }
}

function isProductionBundleType(bundleType) {
  switch (bundleType) {
    case NODE_DEV:
      return false
    case NODE_PROD:
      return true
    default:
      throw new Error(`Unknown type: ${bundleType}`)
  }
}

function getPlugins(pkg, bundleType) {
  const isProduction = isProductionBundleType(bundleType)
  const packageDir = path.join(pkg.getPackageDir(), "src")

  return [
    autoExternal({
      packagePath: pkg.getPackageJsonPath()
    }),

    // Use Node resolution mechanism.
    resolve({
      extensions
    }),

    // We still need CommonJS for external deps like object-assign.
    commonjs(),

    typescript({
      tsconfigOverride: {
        include: [`${packageDir}/**/*.ts`, `${packageDir}/**/*.tsx`],
        exclude: ["**/*.test.ts", "**/*.test.tsx"],
        compilerOptions: {
          rootDir: packageDir,
          declaration: true,
          declarationMap: true,
          mapRoot: "",
          module: "esnext",
          target: "esnext"
        }
      }
    }),

    // Compile to ES5.
    babel(getBabelConfig()),

    // Turn process.env checks into constants.
    replace({
      "process.env.NODE_ENV": isProduction ? "'production'" : "'development'"
    }),

    // Apply dead code elimination and/or minification.
    isProduction &&
      terser({
        sourcemap: true,
        output: { comments: false },
        compress: {
          keep_infinity: true,
          pure_getters: true,
          collapse_vars: false
        },
        ecma: 5,
        warnings: true
      })

    // Record bundle size.
    // sizes({
    //   getSize: (name, size, gzip) => {
    //     const key = `${name} (${bundleType})`
    //     Stats.currentBuildResults.bundleSizes[key] = {
    //       size,
    //       gzip
    //     }
    //   }
    // })
  ].filter(Boolean)
}

function handleRollupError(error) {
  if (!error.code) {
    console.error(error)
    return
  }
  console.error(
    `\x1b[31m-- ${error.code}${error.plugin ? ` (${error.plugin})` : ""} --`
  )
  console.error(error.message)

  if (error.loc == null) return

  const { file, line, column } = error.loc
  if (file) {
    // This looks like an error from Rollup, e.g. missing export.
    // We'll use the accurate line numbers provided by Rollup but
    // use Babel code frame because it looks nicer.
    const rawLines = fs.readFileSync(file, "utf-8")
    // column + 1 is required due to rollup counting column start position from 0
    // whereas babel-code-frame counts from 1
    const frame = codeFrame(rawLines, line, column + 1, {
      highlightCode: true
    })
    console.error(frame)
  } else {
    // This looks like an error from a plugin (e.g. Babel).
    // In this case we'll resort to displaying the provided code frame
    // because we can't be sure the reported location is accurate.
    console.error(error.codeFrame)
  }
}

async function build(pkg, bundleType) {
  const packageJson = pkg.getPackageJson()
  const packageName = packageJson.name
  const logKey =
    chalk.white.bold(packageName) + chalk.dim(` (${bundleType.toLowerCase()})`)

  const rollupConfig = {
    input: pkg.getPackageDir(),
    plugins: getPlugins(pkg, bundleType)
  }

  const outputPath = getFilename(pkg, bundleType)
  const rollupOutputOptions = getRollupOutputOptions(outputPath)

  const spinner = ora(logKey).start()
  try {
    const result = await rollup(rollupConfig)
    await result.write(rollupOutputOptions)
  } catch (error) {
    spinner.fail()
    handleRollupError(error)
    throw error
  }
  spinner.succeed()
}

module.exports = async function(pkg) {
  await build(pkg, NODE_DEV)
  await build(pkg, NODE_PROD)
}
