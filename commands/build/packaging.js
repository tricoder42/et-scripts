"use strict"

const fs = require("fs-extra")
const path = require("path")

const {
  copyTo,
  asyncExecuteCommand,
  asyncExtractTar,
  asyncRimRaf
} = require("./utils")

function getPackageName(name) {
  return name.split("/", 2).reverse()[0]
}

function getBundleOutputPaths(bundleType, filename, packageName) {
  const name = getPackageName(packageName)
  const _filename = filename.replace(/^@[a-z-]*\//, "")

  switch (bundleType) {
    case NOOP:
    case NODE:
      return [`build/packages/${name}/${_filename}`]
    case UNIVERSAL:
      return [`build/packages/${name}/cjs/${_filename}`]
    case UMD_DEV:
    case UMD_PROD:
    //   return [
    //     `build/packages/${packageName}/umd/${filename}`,
    //     `build/dist/${filename}`
    //   ]
    default:
      throw new Error("Unknown bundle type.")
  }
}

function getTarOptions(tgzName, pkg) {
  // Files inside the `yarn pack`ed archive start
  // with "package/" in their paths. We'll undo
  // this during extraction.
  const CONTENTS_FOLDER = "package"
  return {
    src: tgzName,
    dest: pkg.getBuildDir(),
    tar: {
      entries: [CONTENTS_FOLDER],
      map(header) {
        if (header.name.indexOf(CONTENTS_FOLDER + "/") === 0) {
          header.name = header.name.substring(CONTENTS_FOLDER.length + 1)
        }
      }
    }
  }
}

async function prepareNpmPackage(pkg) {
  await Promise.all([
    copyTo("LICENSE.rst", `${pkg.getBuildDir()}/LICENSE.rst`),
    copyTo(
      `${pkg.getPackageDir()}/package.json`,
      `${pkg.getBuildDir()}/package.json`
    ),
    copyTo(
      `${pkg.getPackageDir()}/README.rst`,
      `${pkg.getBuildDir()}/README.rst`
    ),
    copyTo(`${pkg.getPackageDir()}/npm`, `${pkg.getBuildDir()}`)
  ])
  const tgzName = (await asyncExecuteCommand(
    `npm pack ${pkg.getBuildDir()}`
  )).trim()
  await asyncRimRaf(pkg.getBuildDir())
  await asyncExtractTar(getTarOptions(tgzName, pkg))
  await fs.unlink(tgzName)
}

async function preparePackageJson(config, pkg) {
  const version = config.package.version
  const packageJson = pkg.getPackageJson()

  // Copy fields from main package.json
  for (const field of ["version", "author", "license", "repository"]) {
    packageJson[field] = config.package[field]
  }

  packageJson.dependencies = preparePackageDependencies(
    version,
    packageJson.dependencies
  )
  packageJson.devDependencies = preparePackageDependencies(
    version,
    packageJson.devDependencies
  )

  await fs.writeJson(
    path.join(pkg.getBuildDir(), "package.json"),
    packageJson,
    { spaces: 2 }
  )
}

function preparePackageDependencies(version, dependencies) {
  if (!dependencies) return

  const updatedDependencies = {}

  Object.keys(dependencies).forEach(dependency => {
    if (dependency.startsWith("@rst-js/")) {
      updatedDependencies[dependency] = version
    } else {
      // ignore anything else
      updatedDependencies[dependency] = dependencies[dependency]
    }
  })

  return updatedDependencies
}

module.exports = {
  getPackageName,
  getBundleOutputPaths,
  prepareNpmPackage,
  preparePackageJson
}
