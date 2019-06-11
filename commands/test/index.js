const jest = require("jest")
const { getConfig } = require("../shared/getConfig")

const config = getConfig()

module.exports = () => {
  // Do this as the first thing so that any code reading it knows the right env.
  process.env.BABEL_ENV = "test"
  process.env.NODE_ENV = "test"

  const defaultJestConfig = require("./jest.config")

  const args = []

  args.push(
    "--config",
    JSON.stringify({
      ...defaultJestConfig,
      ...config.package.jest
    })
  )

  if (!process.env.CI) {
    args.push("--watch")
  }

  jest.run(args)
}
