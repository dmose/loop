/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var loop = loop || {};
loop.slideshow = (function(_, mozL10n) {
  "use strict";

// App state
  var state = {
    currentSlide: 0,
    data: []
  };

// State transitions
  var actions = {
    toggleNext: function() {
      var current = state.currentSlide;
      var next = current + 1;
      if (next < state.data.length) {
        state.currentSlide = next;
      }
      render(state);
    },
    togglePrev: function() {
      var current = state.currentSlide;
      var prev = current - 1;
      if (prev >= 0) {
        state.currentSlide = prev;
      }
      render(state);
    },
    toggleSlide: function(id) {
      console.log("something worked");
      var index = state.data.map(function(el) {
        return (
          el.id
        );
      });
      var currentIndex = index.indexOf(id);
      state.currentSlide = currentIndex;
      render(state);
    }
  };

  var Slideshow = React.createClass({
    propTypes: {
      data: React.PropTypes.object.isRequired
    },
    render: function() {
      return (
        <div className="slideshow">
          <Slides data={this.props.data} />
          <div className="control-panel">
            <Controls />
          </div>
        </div>
      );
    }
  });

  var Slides = React.createClass({
    propTypes: {
      data: React.PropTypes.object.isRequired
    },
    render: function() {
      var slidesNodes = this.props.data.map(function(slideNode, index) {
        var isActive = state.currentSlide === index;
        return (
          <Slide active={isActive}
                 imageAlt={slideNode.imageAlt}
                 imageClass={slideNode.imageClass}
                 indexClass={slideNode.id}
                 key={slideNode.id}
                 text={slideNode.text}
                 title={slideNode.title} />
        );
      });
      return (
        <div className="slides">
          {slidesNodes}
        </div>
      );
    }
  });

  var Slide = React.createClass({
    propTypes: {
      active: React.PropTypes.bool.isRequired,
      imageClass: React.PropTypes.string.isRequired,
      indexClass: React.PropTypes.string.isRequired,
      text: React.PropTypes.string.isRequired,
      title: React.PropTypes.string.isRequired
    },
    render: function() {
      var classes = React.addons.classSet({
        "slide": true,
        "slide--active": this.props.active
      });
      return (

        <div className={classes}>
          <div className={this.props.indexClass}>
          <div className="slide-layout">
            <h2>{this.props.title}</h2>
            <div className="slide-text">{this.props.text}</div>
          </div>
          <img className={this.props.imageClass} />
          </div>
        </div>
      );
    }
  });

  var Controls = React.createClass({
    togglePrev: function() {
      actions.togglePrev();
    },
    toggleNext: function() {
      actions.toggleNext();
    },
    render: function() {
      var showPrev, showNext;
      var current = state.currentSlide;
      var last = state.data.length;
      if (current > 0) {
        showPrev = <div className="toggle toggle-prev" onClick={this.togglePrev}></div>;
      }
      if (current < last - 1) {
        showNext = <div className="toggle toggle-next" onClick={this.toggleNext}></div>;
      }
      return (
        <div className="controls">
          {showPrev}
          {showNext}
        </div>
      );
    }
  });

  var EmptyMessage = React.createClass({
    render: function() {
      return (
        <div className="empty-message">No Data</div>
      );
    }
  });

  function render() {
    var hasData = state.data.length > 0;
    var component;
    if (hasData) {
      component = <Slideshow data={state.data} />;
    }
    else {
      component = <EmptyMessage />;
    }
    React.render(
      component,
      document.querySelector("#main")
    );
  }

  /**
   * Slideshow initialisation.
   */
  function init() {
    console.log("in init");
    var requests = [
      ["GetAllConstants"],
      ["GetAllStrings"],
      ["GetLocale"],
      ["GetPluralRule"]
    ];
    var prefetch = [
      ["GetLoopPref", "gettingStarted.latestFTUVersion"],
      ["GetLoopPref", "legal.ToS_url"],
      ["GetLoopPref", "legal.privacy_url"],
      ["GetLoopPref", "remote.autostart"],
      ["GetUserProfile"],
      ["GetFxAEnabled"],
      ["GetDoNotDisturb"],
      ["GetHasEncryptionKey"],
      ["IsMultiProcessActive"]
    ];
    return loop.requestMulti.apply(null, requests.concat(prefetch)).then(function(results) {
      console.log("in then");
      // `requestIdx` is keyed off the order of the `requests` and `prefetch`
      // arrays. Be careful to update both when making changes.
      var requestIdx = 0;
      // Do the initial L10n setup, we do this before anything
      // else to ensure the L10n environment is setup correctly.
      var stringBundle = results[++requestIdx];
      var locale = results[++requestIdx];
      var pluralRule = results[++requestIdx];
      console.log("about to call initialize");
      mozL10n.initialize({
        locale: locale,
        pluralRule: pluralRule,
        getStrings: function(key) {
          if (!(key in stringBundle)) {
            console.error("No string found for key: ", key);
            return "{ textContent: '' }";
          }

          return JSON.stringify({
             textContent: stringBundle[key]
           });
        }
      });

      prefetch.forEach(function(req) {
        req.shift();
        loop.storeRequest(req, results[++requestIdx]);
      });

      document.documentElement.setAttribute("lang", mozL10n.language.code);
      document.documentElement.setAttribute("dir", mozL10n.language.direction);
      document.body.setAttribute("platform", loop.shared.utils.getPlatform());

        var data = [
          {
            id: "slide1",
            imageClass: "slide1-image",
            title: mozL10n.get("fte_slide_1_title"),
            text: mozL10n.get("fte_slide_1_copy")
            // title      : "Browse Web pages with a friend",
            // text       : "Whether you’re planning a trip or shopping for a gift, Hello lets you make faster decisions in real time."
          },
          {
            id: "slide2",
            imageClass: "slide2-image",
            title: mozL10n.get("fte_slide_2_title"),
            text: mozL10n.get("fte_slide_2_copy")
          },
          {
            id: "slide3",
            imageClass: "slide3-image",
            title: mozL10n.get("fte_slide_3_title"),
            text: mozL10n.get("fte_slide_3_copy")
          },
          {
            id: "slide4",
            imageClass: "slide4-image",
            title: mozL10n.get("fte_slide_4_title"),
            text: mozL10n.get("fte_slide_4_copy")
          }
        ];
      // Notify the window that we've finished initalization and initial layout
      // var evtObject = document.createEvent("Event");
      // evtObject.initEvent("loopPanelInitialized", true, false);
      // window.dispatchEvent(evtObject);

      // XXX new code starts here
      state.data = data;
      render(state);


      setTimeout(function() {
        state.data = data;
        render(state);
      }, 1000);
    });
  }

  return {
    Slideshow: Slideshow,
    // GettingStartedView: GettingStartedView,
    init: init
  };
})(_, document.mozL10n);

console.log("about to add DOMContentLoaded");
document.addEventListener("DOMContentLoaded", loop.slideshow.init);
console.log("added");
