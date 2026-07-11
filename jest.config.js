module.exports = {
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-redux|@reduxjs|redux-persist|immer|reselect|redux|redux-thunk|react-native-reanimated|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|react-native-vector-icons|react-native-paper|react-native-picker-select|@react-native-async-storage|@react-native-community|@react-native-picker|react-native-worklets|axios|react-native-webview)/)',
  ],
};
