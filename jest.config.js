
const config= {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/?(*.)+(spec|test).ts"],
  moduleFileExtensions: ["ts", "js", "json", "node"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(@aws-sdk|aws-sdk-client-mock)/)",
  ],
  setupFilesAfterEnv: ["aws-sdk-client-mock-jest"],
  verbose: true,
};


module.exports= config