module.exports = {
  rollup(config, options) {
    config.output.banner = '#!/usr/bin/env node';
    return config;
  },
};
