/* eslint-disable @typescript-eslint/no-require-imports */
/* global require, module, console */

require("express");

const { app } = require("./dist/express-app.js");
const { connectDatabase } = require("./dist/config/database.js");

let databaseConnection;

module.exports = async function handler(request, response) {
  try {
    databaseConnection ??= connectDatabase();
    await databaseConnection;
    return app(request, response);
  } catch (error) {
    databaseConnection = undefined;
    console.error("Failed to initialize the API", error);

    return response.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
