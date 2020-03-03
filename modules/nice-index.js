'use strict';
define([
  'module',
  'require',
  'vs/platform/instantiation/common/instantiationService',
  'nice-index/utils',
  'nice-index/tabs',
], function(module, require, instantiationService, utils, tabs) {
  'use strict';
  const addStyleSheet = utils.addStyleSheet;
  let url = require.toUrl(module.id) + '.css';
  if (!url.startsWith('file://')) {
    url = 'file://' + url;
  }
  addStyleSheet(url);
  class _InstantiationService extends instantiationService.InstantiationService {
    constructor() {
      super(...arguments);
      const service = this;
      const run = function(what) {
        try {
          what.run(service);
        } catch (e) {
          console.error(e);
        }
      };
      run(tabs);
    }
  }
  instantiationService.InstantiationService = _InstantiationService;
});
