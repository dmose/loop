/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var loop = loop || {};
loop.panel = (function(_, mozL10n) {
  "use strict";

  // var sharedViews = loop.shared.views;
  // var sharedModels = loop.shared.models;
  // var sharedMixins = loop.shared.mixins;
  // var sharedActions = loop.shared.actions;
  // var Button = sharedViews.Button;


  var data = [
    {
      id         : "slide1",
      imageClass : "slide1-image",
      //title      : mozL10n.get("fte_slide_1_title"),
      //text       : mozL10n.get("fte_slide_1_copy")
      title      : "Browse Web pages with a friend",
      text       : "Whether you’re planning a trip or shopping for a gift, Hello lets you make faster decisions in real time."
    },
    {
      id         : "slide2",
      imageClass : "slide2-image",
      title      : "Slide 2",
      text       : "Slide 2 Image Text"
    },
    {
      id         : "slide3",
      imageClass : "slide3-image",
      title      : "Slide 3",
      text       : "Slide 3 Image Text"
    },
    {
      id         : "slide4",
      imageClass : "slide4-image",
      title      : "Slide 4",
      text       : "Slide 4 Image Text"
    },
  ];

// App state
  var state = {
    currentSlide: 0,
    data        : []
  }

// State transitions
  var actions = {
    toggleNext: function() {
      console.log("something worked");
      var current = state.currentSlide;
      var next = current + 1;
      if (next > state.data.length - 1) {
        next = 0;
      }
      state.currentSlide = next;
      render(state)
    },
    togglePrev: function() {
      console.log("something worked");
      var current = state.currentSlide;
      var prev = current - 1;
      if (prev < 0) {
        prev = state.data.length - 1;
      }
      state.currentSlide = prev;
      render(state);
    },
    toggleSlide: function(id) {
      console.log("something worked");
      var index = state.data.map(function (el) {
        return (
          el.id
        );
      });
      var currentIndex = index.indexOf(id);
      state.currentSlide = currentIndex;
      render(state);
    }
  }

  var Slideshow = React.createClass({
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
    render: function() {
      var slidesNodes = this.props.data.map(function (slideNode, index) {
        var isActive = state.currentSlide === index;
        return (
          <Slide active={isActive} key={slideNode.id} indexClass={slideNode.id} imageClass={slideNode.imageClass} imageAlt={slideNode.imageAlt} title={slideNode.title} text={slideNode.text} />
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
    render: function() {
      var classes = React.addons.classSet({
        'slide': true,

        'slide--active': this.props.active
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
      return (
        <div className="controls">
          <div className="toggle toggle-prev" onClick={this.togglePrev}></div>
          <div className="toggle toggle-next" onClick={this.toggleNext}></div>
        </div>
      );
    }
  });

  //var Pagination = React.createClass({
  //  render: function() {
  //    var paginationNodes = this.props.data.map(function (paginationNode, index) {
  //      return (
  //        <Pager id={paginationNode.id} key={paginationNode.id} title={paginationNode.title}  />
  //      );
  //    });
  //    return (
  //      <div className="pagination">
  //        {paginationNodes}
  //      </div>
  //    );
  //  }
  //});
  //
  //var Pager = React.createClass({
  //  toggleSlide: function() {
  //    actions.toggleSlide(this.props.id);
  //  },
  //  render: function() {
  //    return (
  //      <span className="pager" onClick={this.toggleSlide}>{this.props.title}</span>
  //    );
  //  }
  //});

  var EmptyMessage = React.createClass({
    render: function() {
      return (
        <div className="empty-message">No Data</div>
      );
    }
  });

  function render(state) {
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





  //var GettingStartedView = React.createClass({
  //  mixins: [sharedMixins.WindowCloseMixin],
  //
  //  handleButtonClick: function() {
  //    loop.requestMulti(
  //      ["OpenGettingStartedTour", "getting-started"],
  //      ["SetLoopPref", "gettingStarted.latestFTUVersion", FTU_VERSION]
  //    ).then(function() {
  //        // XXX why are we dispatching this event here, as all it does is
  //        // cause the pref to be re-read in to some React or Flux state?
  //        // And even if we do need to do that, why not do it here directly?
  //        var event = new CustomEvent("GettingStartedSeen");
  //        window.dispatchEvent(event);
  //      }.bind(this));
  //    this.closeWindow();
  //  },
  //
  //  render: function() {
  //    return (
  //      <div className="fte-get-started-content">
  //        <div className="fte-title">
  //          <img className="fte-logo" src="shared/img/hello_logo.svg" />
  //          <div className="fte-subheader">
  //            {mozL10n.get("first_time_experience_subheading2")}
  //          </div>
  //          <hr className="fte-separator"/>
  //          <div className="fte-content">
  //            {mozL10n.get("first_time_experience_content")}
  //          </div>
  //          <img className="fte-hello-web-share" src="shared/img/hello-web-share.svg" />
  //        </div>
  //        <div className="fte-button-container">
  //          <Button additionalClass="fte-get-started-button"
  //                  caption={mozL10n.get("first_time_experience_button_label2")}
  //                  htmlId="fte-button"
  //                  onClick={this.handleButtonClick} />
  //        </div>
  //      </div>
  //    );
  //  }
  //});


  /**
   * Slideshow initialisation.
   */
  function init() {

    //var requests = [
    //  ["GetAllConstants"],
    //  ["GetAllStrings"],
    //  ["GetLocale"],
    //  ["GetPluralRule"]
    //];
    //var prefetch = [
    //  ["GetLoopPref", "gettingStarted.latestFTUVersion"],
    //  ["IsMultiProcessEnabled"]
    //];
    //return loop.requestMulti.apply(null, requests.concat(prefetch)).then(function(results) {
    //  // `requestIdx` is keyed off the order of the `requests` and `prefetch`
    //  // arrays. Be careful to update both when making changes.
    //  var requestIdx = 0;
    //  var constants = results[requestIdx];
    //  // Do the initial L10n setup, we do this before anything
    //  // else to ensure the L10n environment is setup correctly.
    //  var stringBundle = results[++requestIdx];
    //  var locale = results[++requestIdx];
    //  var pluralRule = results[++requestIdx];
    //  mozL10n.initialize({
    //    locale: locale,
    //    pluralRule: pluralRule,
    //    getStrings: function(key) {
    //      if (!(key in stringBundle)) {
    //        console.error("No string found for key: ", key);
    //        return "{ textContent: '' }";
    //      }
    //
    //      return JSON.stringify({ textContent: stringBundle[key] });
    //    }
    //  });
    //
    //  prefetch.forEach(function(req) {
    //    req.shift();
    //    loop.storeRequest(req, results[++requestIdx]);
    //  });
    //
    //  var dispatcher = new loop.Dispatcher();
      //var roomStore = new loop.store.RoomStore(dispatcher, {
      //  notifications: notifications,
      //  constants: constants
      //});


    //window.addEventListener("load", function() {
    //  state.data = data;
    //  render(state);
    //});

    state.data = data;
    render(state);


    setTimeout(function() {
      state.data = data;
      render(state);
    }, 1000)


      // document.documentElement.setAttribute("lang", mozL10n.language.code);
      // document.documentElement.setAttribute("dir", mozL10n.language.direction);
      // document.body.setAttribute("platform", loop.shared.utils.getPlatform());

      // Notify the window that we've finished initalization and initial layout
      // var evtObject = document.createEvent("Event");
      // evtObject.initEvent("loopPanelInitialized", true, false);
      // window.dispatchEvent(evtObject);
    //});
  }

  return {
    Slideshow: Slideshow,
    // GettingStartedView: GettingStartedView,
    init: init
  };
})(_, document.mozL10n);

document.addEventListener("DOMContentLoaded", loop.panel.init);
