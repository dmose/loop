/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/* global setRootObject, oncePerContentProcess */

describe("oncePerContentProcess", function() { // eslint-disable-line
  "use strict"; // eslint-disable-line 

  // var expect = chai.expect;
  var fakeGlobal;
  var fakeAboutLoop;

  beforeEach(function() {
    fakeAboutLoop = {
      conversation: {
        register: sinon.stub()
      }
    };

    fakeGlobal = {
      Components: {
        utils: {
          import: function() {}
        }
      },
      AboutLoop: fakeAboutLoop
    };

    setRootObject(fakeGlobal);
  });

  it("should call AboutLoop.conversation.register", function() {
    oncePerContentProcess(fakeAboutLoop);

    sinon.assert.calledOnce(fakeAboutLoop.conversation.register);
    sinon.assert.calledWithExactly(fakeAboutLoop.conversation.register);
  });
});
