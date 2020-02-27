define(["exports", "vs/workbench/browser/layout"], function(exports, layout) {
  function waitForElementToDisplay(selector, time) {
    if (document.querySelector(selector) != null) {
      // Select the node that will be observed for mutations
      const targetNode = document.querySelector(".tabs-container");

      // Options for the observer (which mutations to observe)
      const config = {
        attributes: true,
        attributeOldValue: true,
        attributeFilter: ["aria-label"],
        subtree: true,
        childList: true
      };

      const callback = (mutationsList, observer) => {
        const addOrRemoves = mutationsList.filter(
          m => m.type === "childList" && m.target === targetNode
        );
        const attributeChanges = mutationsList.filter(
          m =>
            m.type === "attributes" &&
            m.oldValue !== m.target.attributes["aria-label"].value
        );

        console.log(addOrRemoves, attributeChanges);
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
    console.log("test");
    console.log(layout);

    waitForElementToDisplay(".tabs-container", 1000);
  };
});
