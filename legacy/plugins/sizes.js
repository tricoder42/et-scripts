"use strict"

const gzip = require("gzip-size")

module.exports = function sizes(options) {
  return {
    name: "sizes",
    generateBundle(config, bundle) {
      for (const [name, obj] of Object.entries(bundle)) {
        const size = Buffer.byteLength(obj.code)
        const gzipSize = gzip.sync(obj.code)

        options.getSize(name, size, gzipSize)
      }
    }
  }
}
