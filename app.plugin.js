const {
  withGradleProperties,
  withPodfileProperties,
  createRunOncePlugin,
} = require('expo/config-plugins');

const pkg = require('./package.json');

const GRADLE_KEY = 'VisionCameraOcrPlus_disableTranslate';
const PODFILE_KEY = 'visionCameraOcrPlus.disableTranslate';
const NON_LATIN_GRADLE_KEY =
  'VisionCameraOcrPlus_disableNonLatinTextRecognition';
const NON_LATIN_PODFILE_KEY =
  'visionCameraOcrPlus.disableNonLatinTextRecognition';

/**
 * Expo config plugin for omitting optional ML Kit models from native builds.
 */
const withVisionCameraOcrPlus = (config, props = {}) => {
  if (!props.disableTranslate && !props.disableNonLatinTextRecognition)
    return config;

  if (props.disableTranslate) {
    config = withGradleProperties(config, (cfg) => {
      cfg.modResults = cfg.modResults.filter(
        (item) => !(item.type === 'property' && item.key === GRADLE_KEY)
      );
      cfg.modResults.push({ type: 'property', key: GRADLE_KEY, value: 'true' });
      return cfg;
    });
  }

  if (props.disableNonLatinTextRecognition) {
    config = withGradleProperties(config, (cfg) => {
      cfg.modResults = cfg.modResults.filter(
        (item) =>
          !(item.type === 'property' && item.key === NON_LATIN_GRADLE_KEY)
      );
      cfg.modResults.push({
        type: 'property',
        key: NON_LATIN_GRADLE_KEY,
        value: 'true',
      });
      return cfg;
    });
  }

  return withPodfileProperties(config, (cfg) => {
    if (props.disableTranslate) cfg.modResults[PODFILE_KEY] = 'true';
    if (props.disableNonLatinTextRecognition)
      cfg.modResults[NON_LATIN_PODFILE_KEY] = 'true';
    return cfg;
  });
};

module.exports = createRunOncePlugin(
  withVisionCameraOcrPlus,
  pkg.name,
  pkg.version
);
