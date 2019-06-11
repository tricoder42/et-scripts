const chalk = require("chalk")
const ora = require("ora")

const { copyTo } = require("./utils")

module.exports = async function(pkg) {
  const packageJson = pkg.getPackageJson()
  const logKey = chalk.white.bold(packageJson.name)

  const spinner = ora(logKey).start()
  try {
    await copyTo(pkg.getPackageDir(), pkg.getBuildDir())
  } catch (error) {
    spinner.fail()
    throw error
  }
  spinner.succeed()
}
