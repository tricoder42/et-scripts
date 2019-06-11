const { getConfig } = require("../shared/getConfig")
const { getPackages } = require("../shared/packages")

const Packaging = require("./packaging")
// const Stats = require("./stats")
const { asyncRimRaf } = require("./utils")

const config = getConfig()
const packages = getPackages(config)

const builders = {
  universal: require("./build.rollup"),
  node: require("./build.babel"),
  noop: require("./build.noop")
}

module.exports = async function build(requestedPackages = []) {
  await asyncRimRaf(config.paths.build)

  for (const pkg of packages) {
    if (requestedPackages.length && !requestedPackages.includes(pkg.path))
      continue

    const builder = builders[pkg.type]
    if (!builder) {
      console.error(`Unknown type: ${pkg.type}`)
      process.exit(1)
    }

    await builder(pkg)
    await Packaging.prepareNpmPackage(pkg)
    await Packaging.preparePackageJson(config, pkg)
  }

  // console.log(Stats.printResults())
  // if (argv.saveStats) Stats.saveResults()
}
