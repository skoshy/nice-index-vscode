'use strict';
const getAttributeNewValue = target => target.attributes['aria-label'].value;
const isIndexFile = ariaLabel => !!ariaLabel.toLowerCase().match(/index\.\w+/);
const createTabDiff = ({ type, target, newValue, oldValue }) => {
  return {
    type,
    target,
    newValue,
    oldValue,
    isIndexFile: isIndexFile(newValue),
  };
};
const checkIsIndexTab = tab => {};
define(['exports', 'vs/workbench/browser/layout'], function(exports, layout) {
  function waitForElementToDisplay(selector, time) {
    if (document.querySelector(selector) != null) {
      // Select the node that will be observed for mutations
      const targetNode = document.querySelector('.tabs-container');
      // Options for the observer (which mutations to observe)
      const config = {
        attributes: true,
        attributeOldValue: true,
        attributeFilter: ['aria-label'],
        subtree: true,
        childList: true,
      };
      const callback = (mutationsList, observer) => {
        const allTabs = Array.from(
          document.querySelectorAll('.tabs-container > .tab')
        );
        const addOrRemovesTabDiffs = mutationsList
          // filter to only add or removes
          .filter(m => m.type === 'childList' && m.target === targetNode)
          // get the tab diffs
          .reduce((acc, m) => {
            m.addedNodes.forEach(a =>
              acc.push(
                createTabDiff({
                  type: 'added',
                  target: a,
                  newValue: getAttributeNewValue(a),
                })
              )
            );
            m.removedNodes.forEach(a =>
              acc.push(
                createTabDiff({
                  type: 'added',
                  target: a,
                  newValue: getAttributeNewValue(a),
                })
              )
            );
            return acc;
          }, []);
        const attributeChangesTabDiffs = mutationsList
          // filter to only attribute changes
          .filter(
            m =>
              m.type === 'attributes' &&
              m.oldValue !== getAttributeNewValue(m.target)
          )
          // get the tab diffs
          .map(m =>
            createTabDiff({
              type: 'attribute',
              target: m.target,
              oldValue: m.oldValue,
              newValue: getAttributeNewValue(m.target),
            })
          );
        const tabDiffs = addOrRemovesTabDiffs.concat(attributeChangesTabDiffs);

        let hasIndexTabs = false;
        allTabs.forEach(t => {
          const isTabIndexFile = isIndexFile(getAttributeNewValue(t));
          const doesTabHaveDescriptionLabel =
            t.querySelector('.label-description') &&
            t.querySelector('.label-description').innerText !== '';

          t.setAttribute('data-nice-index-is-index-tab', isTabIndexFile);
          t.setAttribute(
            'data-nice-index-has-description-label',
            doesTabHaveDescriptionLabel
          );

          hasIndexTabs = hasIndexTabs || isTabIndexFile;
        });

        targetNode.setAttribute('data-nice-index-has-index-tabs', hasIndexTabs);
      };
      const observer = new MutationObserver(callback);
      observer.observe(targetNode, config);
      return;
    } else {
      setTimeout(function() {
        waitForElementToDisplay(selector, time);
      }, time);
    }
  }
  exports.run = function() {
    waitForElementToDisplay('.tabs-container', 1000);
  };
});
