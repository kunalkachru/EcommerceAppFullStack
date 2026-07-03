/**
 * @format
 */

import { applyApiTarget } from "./src/config/apiTarget";

applyApiTarget();

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
