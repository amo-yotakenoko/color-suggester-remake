const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      webpackConfig.module.rules.push({
        test: /\.mjs$/,
        resolve: {
          fullySpecified: false,
        },
        include: /node_modules\/@mediapipe\/tasks-vision/,
        type: 'javascript/auto',
      });

      webpackConfig.ignoreWarnings = [
        function ignoreSourcemapsloaderWarnings(warning) {
          return (
            warning.module &&
            warning.module.resource.includes('node_modules/@mediapipe/tasks-vision') &&
            warning.details &&
            warning.details.includes('Failed to parse source map')
          );
        },
      ];

      return webpackConfig;
    },
  },
};