const path = require("path")

const appPath = process.cwd()

function getConfig() {
  const configPath = path.join(appPath, "release.config.js")
  const releaseConfig = require(configPath)

  return {
    paths: {
      app: appPath,
      build: path.join(appPath, releaseConfig.buildDir),
      packages: path.join(appPath, releaseConfig.packagesDir)
    },
    package: require(path.join(appPath, "package.json")),
    bundles: releaseConfig.bundles,
  }
}

module.exports = {
  getConfig
}
