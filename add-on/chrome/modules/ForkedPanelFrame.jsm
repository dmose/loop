/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

// A module for working with panels with iframes shared across windows.

/* exported ForkedPanelFrame */

this.EXPORTED_SYMBOLS = ["ForkedPanelFrame"];

const { interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "CustomizableUI", "resource:///modules/CustomizableUI.jsm");

// The minimum sizes for the auto-resize panel code.
const PANEL_MIN_HEIGHT = 100;
const PANEL_MIN_WIDTH = 330;

var PanelFrameInternal = {
  /**
   * Helper function to get and hold a single instance of a DynamicResizeWatcher.
   */
  get _dynamicResizer() {
    delete this._dynamicResizer;
    this._dynamicResizer = new DynamicResizeWatcher();
    return this._dynamicResizer;
  },

  /**
   * Status panels are one-per button per-process, we swap the docshells between
   * windows when necessary.
   *
   * @param {DOMWindow} aWindow The window in which to show the popup.
   * @param {PanelUI} aPanelUI The panel UI object that represents the application menu.
   * @param {DOMElement} aButton The button element that is pressed to show the popup.
   * @param {String} aType The type of panel this is, e.g. "social" or "loop".
   * @param {String} aOrigin Optional, the origin to use for the iframe.
   * @param {String} aSrc The url to load into the iframe.
   * @param {String} aSize The initial size of the panel (width and height are the same
   *                       if specified).
   */
  _attachNotificatonPanel: function(aWindow, aParent, aButton, aType, aOrigin, aSrc, aSize) {
    aParent.hidden = false;
    let notificationFrameId = aOrigin ? aType + "-status-" + aOrigin : aType + "-panel-iframe";
    let doc = aWindow.document;
    let frame = doc.getElementById(notificationFrameId);

    // If the button was customized to a new location, destroy the
    // iframe and start fresh.
    if (frame && frame.parentNode != aParent) {
      frame.parentNode.removeChild(frame);
      frame = null;
    }

    if (!frame) {
      let { width, height } = aSize ? aSize : { width: PANEL_MIN_WIDTH, height: PANEL_MIN_HEIGHT };
      frame = doc.createElement("browser");
      let attrs = {
        "type": "content",
        "mozbrowser": "true",
        // All frames use social-panel-frame as the class.
        "class": "social-panel-frame",
        "id": notificationFrameId,
        "tooltip": "aHTMLTooltip",
        "context": "contentAreaContextMenu",
        "flex": "1",

        // work around bug 793057 - by making the panel roughly the final size
        // we are more likely to have the anchor in the correct position.
        "style": "width: " + width + "px; height: " + height + "px;",
        "dynamicresizer": !aSize,

        "origin": aOrigin,
        "src": aSrc
      };
      if (aType == "social") {
        attrs["message"] = "true";
        attrs["messagemanagergroup"] = aType;
      }
      for (let [k, v] of Iterator(attrs)) {
        frame.setAttribute(k, v);
      }
      aParent.appendChild(frame);
    } else {
      frame.setAttribute("origin", aOrigin);
      frame.setAttribute("src", aSrc);
    }
    aButton.setAttribute("notificationFrameId", notificationFrameId);
  }
};

/**
 * The exported PanelFrame object
 */
var ForkedPanelFrame = {
  /**
   * Shows a popup in a pop-up panel, or in a sliding panel view in the application menu.
   * It will move the iframe to different DOM locations depending on where it needs to be
   * shown, enabling one iframe to be used for the entire session.
   *
   * @param {DOMWindow} aWindow The window in which to show the popup.
   * @param {PanelUI} aPanelUI The panel UI object that represents the application menu.
   * @param {DOMElement} aToolbarButton The button element that is pressed to show the popup.
   * @param {String} aType The type of panel this is, e.g. "social" or "loop".
   * @param {String} aOrigin Optional, the origin to use for the iframe.
   * @param {String} aSrc The url to load into the iframe.
   * @param {String} aSize The initial size of the panel (width and height are the same
   *                       if specified).
   * @param {Function} aCallback Optional, callback to be called with the iframe when it is
   *                             set up.
   */
  showPopup: function(aWindow, aToolbarButton, aType, aOrigin, aSrc, aSize, aCallback) {
    dump("in ForkedPanelFrame.showPopup\n");

    // if we're overflowed, our anchor needs to be the overflow button
    let widgetGroup = CustomizableUI.getWidget(aToolbarButton.getAttribute("id"));
    let widget = widgetGroup.forWindow(aWindow);
    // if we're a slice in the hamburger, our anchor will be the menu button,
    // this panel will replace the menu panel when the button is clicked on
    let anchorBtn = widget.anchor;

    let panel = aWindow.document.getElementById(aType + "-notification-panel");
    PanelFrameInternal._attachNotificatonPanel(aWindow, panel, aToolbarButton, aType, aOrigin, aSrc, aSize);

    let notificationFrameId = aToolbarButton.getAttribute("notificationFrameId");
    let notificationFrame = aWindow.document.getElementById(notificationFrameId);


    // Clear dimensions on all browsers so the panel size will
    // only use the selected browser.
    let frameIter = panel.firstElementChild;
    while (frameIter) {
      frameIter.collapsed = (frameIter != notificationFrame);
      frameIter = frameIter.nextElementSibling;
    }

    function dispatchPanelEvent(name) {
      let evt = notificationFrame.contentDocument.createEvent("CustomEvent");
      evt.initCustomEvent(name, true, true, {});
      notificationFrame.contentDocument.documentElement.dispatchEvent(evt);
    }

    // we only use a dynamic resizer when we're located the toolbar.
    let dynamicResizer;
    if (notificationFrame.getAttribute("dynamicresizer") == "true") {
      dynamicResizer = PanelFrameInternal._dynamicResizer;
    }
    panel.addEventListener("popuphidden", function onpopuphiding() {
      panel.removeEventListener("popuphidden", onpopuphiding);
      anchorBtn.removeAttribute("open");
      if (dynamicResizer) {
        dynamicResizer.stop();
      }
      notificationFrame.docShell.isActive = false;
      dispatchPanelEvent(aType + "FrameHide");
    });

    panel.addEventListener("popupshown", function onpopupshown() {
      panel.removeEventListener("popupshown", onpopupshown);
      let initFrameShow = () => {
        notificationFrame.docShell.isActive = true;
        notificationFrame.docShell.isAppTab = true;
        if (dynamicResizer) {
          dynamicResizer.start(panel, notificationFrame);
        }
        dispatchPanelEvent(aType + "FrameShow");
      };
      // This attribute is needed on both the button and the
      // containing toolbaritem since the buttons on OS X have
      // moz-appearance:none, while their container gets
      // moz-appearance:toolbarbutton due to the way that toolbar buttons
      // get combined on OS X.
      anchorBtn.setAttribute("open", "true");
      if (notificationFrame.contentDocument &&
          notificationFrame.contentDocument.readyState == "complete") {
        initFrameShow();
      } else {
        // first time load, wait for load and dispatch after load
        notificationFrame.addEventListener("load", function panelBrowserOnload() {
          notificationFrame.removeEventListener("load", panelBrowserOnload, true);
          initFrameShow();
        }, true);
      }
    });

    let anchor = aWindow.document.getAnonymousElementByAttribute(anchorBtn, "class", "toolbarbutton-icon");
    // Bug 849216 - open the popup asynchronously so we avoid the auto-rollup
    // handling from preventing it being opened in some cases.
    Services.tm.mainThread.dispatch(function() {
      panel.openPopup(anchor, "bottomcenter topright", 0, 0, false, false);
    }, Ci.nsIThread.DISPATCH_NORMAL);

    if (aCallback) {
      aCallback(notificationFrame);
    }
  }
};

function sizeSocialPanelToContent(panel, iframe, requestedSize) {
  let doc = iframe.contentDocument;
  if (!doc || !doc.body) {
    return;
  }
  // We need an element to use for sizing our panel.  See if the body defines
  // an id for that element, otherwise use the body itself.
  let body = doc.body;
  let docEl = doc.documentElement;
  let bodyId = body.getAttribute("contentid");
  if (bodyId) {
    body = doc.getElementById(bodyId) || doc.body;
  }
  // offsetHeight/Width don't include margins, so account for that.
  let cs = doc.defaultView.getComputedStyle(body);
  let width = Math.max(PANEL_MIN_WIDTH, docEl.offsetWidth);
  let height = Math.max(PANEL_MIN_HEIGHT, docEl.offsetHeight);
  // if the panel is preloaded prior to being shown, cs will be null.  in that
  // case use the minimum size for the panel until it is shown.
  if (cs) {
    let computedHeight = parseInt(cs.marginTop) + body.offsetHeight + parseInt(cs.marginBottom);
    height = Math.max(computedHeight, height);
    let computedWidth = parseInt(cs.marginLeft) + body.offsetWidth + parseInt(cs.marginRight);
    width = Math.max(computedWidth, width);
  }

  // if our scrollHeight is still larger than the iframe, the css calculations
  // above did not work for this site, increase the height. This can happen if
  // the site increases its height for additional UI.
  if (docEl.scrollHeight >= iframe.boxObject.height) {
    height = docEl.scrollHeight;
  }

  // if a size was defined in the manifest use it as a minimum
  if (requestedSize) {
    if (requestedSize.height) {
      height = Math.max(height, requestedSize.height);
    }
    if (requestedSize.width) {
      width = Math.max(width, requestedSize.width);
    }
  }

  // add the extra space used by the panel (toolbar, borders, etc) if the iframe
  // has been loaded
  if (iframe.boxObject.width && iframe.boxObject.height) {
    // add extra space the panel needs if any
    width += panel.boxObject.width - iframe.boxObject.width;
    height += panel.boxObject.height - iframe.boxObject.height;
  }

  // using panel.sizeTo will ignore css transitions, set size via style
  if (Math.abs(panel.boxObject.width - width) >= 2) {
    panel.style.width = width + "px";
  }
  if (Math.abs(panel.boxObject.height - height) >= 2) {
    panel.style.height = height + "px";
  }
}

function DynamicResizeWatcher() {
  this._mutationObserver = null;
}

DynamicResizeWatcher.prototype = {
  start: function DynamicResizeWatcher_start(panel, iframe, requestedSize) {
    this.stop(); // just in case...
    let doc = iframe.contentDocument;
    this._mutationObserver = new iframe.contentWindow.MutationObserver(() => {
      sizeSocialPanelToContent(panel, iframe, requestedSize);
    });
    // Observe anything that causes the size to change.
    let config = { attributes: true, characterData: true, childList: true, subtree: true };
    this._mutationObserver.observe(doc, config);
    // and since this may be setup after the load event has fired we do an
    // initial resize now.
    sizeSocialPanelToContent(panel, iframe, requestedSize);
  },
  stop: function DynamicResizeWatcher_stop() {
    if (this._mutationObserver) {
      try {
        this._mutationObserver.disconnect();
      } catch (ex) {
        // may get "TypeError: can't access dead object" which seems strange,
        // but doesn't seem to indicate a real problem, so ignore it...
      }
      this._mutationObserver = null;
    }
  }
};
