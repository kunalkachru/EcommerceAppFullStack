/**
 * @format
 */

import { applyApiTarget } from "./src/config/apiTarget";

// Apply cloud/local API host before any module reads getApiBaseUrl() at load time.
applyApiTarget();

const { AppRegistry } = require("react-native");
const App = require("./App").default;
const { name: appName } = require("./app.json");

AppRegistry.registerComponent(appName, () => App);
