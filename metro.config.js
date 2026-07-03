const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Limit max parallel workers to 2 to prevent Out of Memory crashes on Windows
config.maxWorkers = 2;

module.exports = config;
