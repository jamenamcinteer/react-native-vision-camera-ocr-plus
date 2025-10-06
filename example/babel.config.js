module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      'babel-preset-expo',
      ['@babel/preset-env', { targets: { node: 'current' } }],
    ],
    plugins: [
      ['react-native-worklets-core/plugin'], // required for Frame Processors
    ],
  };
};
