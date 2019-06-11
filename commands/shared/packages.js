const path = require("path")

function getPackages(config) {
  return config.bundles.map(bundle => new Package({ path: bundle.path, type: bundle.type, config }))
}

function Package({ path, type, config }) {
  this.path = path
  this.type = type
  this.config = config
}

Package.prototype.getPackageDir = function() {
  return path.join(this.config.paths.packages, this.path)
}

Package.prototype.getBuildDir = function() {
  return path.join(this.config.paths.build, this.path)
}

Package.prototype.getPackageJsonPath = function() {
  return path.join(this.getPackageDir(), "package.json")
}

Package.prototype.getPackageJson = function() {
  if (this._package == null) {
    this._package = require(this.getPackageJsonPath())
  }

  return this._package
}

module.exports = {
  getPackages,
}
