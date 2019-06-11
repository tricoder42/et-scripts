const fs = require("fs")
const path = require("path")
const chalk = require("chalk")
const babel = require("@babel/core")
const ora = require("ora")

const babelConfig = require("../../babel")
const { asyncMkDirP } = require("./utils")

const ignorePatterns = [/\.test.[jt]s$/, /fixtures/]

module.exports = async function(pkg) {
  const packageJson = pkg.getPackageJson()
  const logKey = chalk.white.bold(packageJson.name)

  const spinner = ora(logKey).start()

  try {
    const srcDir = path.join(pkg.getPackageDir(), "src")
    const files = walk(srcDir)

    const declarationFilePath = path.join(pkg.getPackageDir(), "index.d.ts")
    if (fs.existsSync(declarationFilePath)) {
      files.push("index.d.ts")
    }

    for (const filename of files) {
      await asyncMkDirP(pkg.getBuildDir())

      if (!filename.endsWith(".d.ts")) {
        const { code } = babel.transformFileSync(
          path.join(srcDir, filename),
          babelConfig({ modules: true })
        )
        const outputPath = path.join(pkg.getBuildDir(), filename)
        fs.writeFileSync(outputPath.replace(/\.ts$/, ".js"), code)
      } else {
        fs.copyFileSync(
          path.join(pkg.getPackageDir(), filename),
          pkg.getBuildDir()
        )
      }
    }
  } catch (error) {
    spinner.fail()
    throw error
  }

  spinner.succeed()
}

function walk(base, relativePath = "") {
  let files = []

  fs.readdirSync(path.join(base, relativePath)).forEach(dirname => {
    const directory = path.join(relativePath, dirname)
    if (fs.lstatSync(path.join(base, directory)).isDirectory()) {
      files = files.concat(walk(base, directory))
    } else if (
      !/\.[jt]s$/.test(directory) ||
      ignorePatterns.some(pattern => pattern.test(directory))
    ) {
      // return
    } else {
      files.push(directory)
    }
  })

  return files
}
