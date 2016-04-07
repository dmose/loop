/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/*
 * This file contains tests for checking the channel from the standalone to
 * LoopRooms works for checking if rooms can be opened within the conversation
 * window.
 */
"use strict";

var { WebChannel } = Cu.import("resource://gre/modules/WebChannel.jsm", {});
var { Chat } = Cu.import("resource:///modules/Chat.jsm", {});

const TEST_URI =
  "example.com/browser/browser/extensions/loop/chrome/test/mochitest/test_loopLinkClicker_channel.html";
const TEST_URI_GOOD = Services.io.newURI("https://" + TEST_URI, null, null);
const TEST_URI_BAD = Services.io.newURI("http://" + TEST_URI, null, null);

const ROOM_TOKEN = "fake1234";
const LINKCLICKER_URL_PREFNAME = "loop.linkClicker.url";

var openChatOrig = Chat.open;

var fakeRoomList = new Map([[ROOM_TOKEN, { roomToken: ROOM_TOKEN }]]);

function BackChannel(uri) {
  this.channel = new WebChannel("test-loop-link-clicker-backchannel", uri);

  this.channel.listen((id, data) => {
    if (this.pendingResolve) {
      let resolve = this.pendingResolve;
      this.pendingResolve = null;
      resolve(data);
      return;
    }

    this.receivedData = data;
  });
}

BackChannel.prototype = {
  channel: null,
  receivedData: null,
  pendingResolve: null,

  tearDown: function() {
    this.channel.stopListening();
  }
};

var gGoodBackChannel;
var gBadBackChannel;

// Loads the specified URI in a new tab and waits for it to send us data on our
// test web-channel and resolves with that data.
function promiseNewChannelResponse(uri, channel, hash) {
  let waitForChannelPromise = new Promise((resolve) => {
    if (channel.receivedData) {
      let data = channel.receivedData;
      channel.receivedData = null;
      resolve(data);
      return;
    }

    channel.pendingResolve = resolve;
  });

  return BrowserTestUtils.withNewTab({
    gBrowser: gBrowser,
    url: uri.spec + "#" + hash
  }, () => waitForChannelPromise);
}

add_task(function* setup() {
  gGoodBackChannel = new BackChannel(TEST_URI_GOOD);
  gBadBackChannel = new BackChannel(TEST_URI_BAD);

  registerCleanupFunction(() => {
    gGoodBackChannel.tearDown();
    gBadBackChannel.tearDown();
  });

  yield undefined;
});

add_task(function* test_loopRooms_webChannel_permissions() {
  // We haven't set the allowed web page yet - so even the "good" URI should fail.
  let got = yield promiseNewChannelResponse(TEST_URI_GOOD, gGoodBackChannel, "checkWillOpenRoom");
  // Should have no data.
  Assert.ok(got.message === undefined, "should have failed to get any data");

  // Add a permission manager entry for our URI.
  Services.prefs.setCharPref(LINKCLICKER_URL_PREFNAME, TEST_URI_GOOD.spec);
  registerCleanupFunction(() => {
    Services.prefs.clearUserPref(LINKCLICKER_URL_PREFNAME);
  });

  // Try again - now we are expecting a response with actual data.
  got = yield promiseNewChannelResponse(TEST_URI_GOOD, gGoodBackChannel, "checkWillOpenRoom");

  // The room doesn't exist, so we should get a negative response.
  Assert.equal(got.message.response, false, "should have got a response of false");

  // Now a http:// URI - should get nothing even with the permission setup.
  got = yield promiseNewChannelResponse(TEST_URI_BAD, gBadBackChannel, "checkWillOpenRoom");
  Assert.ok(got.message === undefined, "should have failed to get any data");
});

add_task(function* test_loopRooms_webchannel_checkWillOpenRoom() {
  // We've already tested if the room doesn't exist above, so here we add the
  // room and check the result.
  LoopRooms._setRoomsCache(fakeRoomList);

  let got = yield promiseNewChannelResponse(TEST_URI_GOOD, gGoodBackChannel, "checkWillOpenRoom");

  Assert.equal(got.message.response, true, "should have got a response of true");
});

/* Test infobar after opening room */

var [, gHandlers] = LoopAPI.inspect();

var handlers = [
  { windowId: null }, { windowId: null }
];

var listenerCount = 41;
var listenerIds = [];

function promiseWindowId() {
  return new Promise(resolve => {
      LoopAPI.stub([{
      sendAsyncMessage: function(messageName, data) {
        let [name, windowId] = data;
        if (name == "BrowserSwitch") {
          LoopAPI.restore();
          resolve(windowId);
        }
      }
    }]);
  listenerIds.push(++listenerCount);
  gHandlers.AddBrowserSharingListener({ data: [listenerCount] }, () => {});
});
}

function* promiseWindowIdReceivedOnAdd(handler) {
  handler.windowId = yield promiseWindowId();
}

var createdTabs = [];

function* promiseWindowIdReceivedNewTab(handlersParam = []) {
  let createdTab = gBrowser.selectedTab = gBrowser.addTab("about:mozilla");
  createdTabs.push(createdTab);

  let windowId = yield promiseWindowId();

  for (let handler of handlersParam) {
    handler.windowId = windowId;
  }
}

function promiseRemoveTab(tab) {
  return new Promise(resolve => {
      gBrowser.tabContainer.addEventListener("TabClose", function onTabClose() {
      gBrowser.tabContainer.removeEventListener("TabClose", onTabClose);
      resolve();
    });
  gBrowser.removeTab(tab);
});
}

function* removeTabs() {
  for (let createdTab of createdTabs) {
    yield promiseRemoveTab(createdTab);
  }

  createdTabs = [];
}

add_task(function* test_loopRooms_webchannel_openRoom() {
  let openedUrl;
  Chat.open = function(contentWindow, options) {
    openedUrl = options.url;
  };

  MozLoopServiceInternal.mocks.isChatWindowOpen = false;

  registerCleanupFunction(() => {
    Chat.open = openChatOrig;
    MozLoopServiceInternal.mocks.isChatWindowOpen = undefined;
  });

  // Test when the room doesn't exist
  LoopRooms._setRoomsCache();

  let got = yield promiseNewChannelResponse(TEST_URI_GOOD, gGoodBackChannel, "openRoom");

  Assert.ok(!openedUrl, "should not open a chat window");
  Assert.equal(got.message.response, false, "should have got a response of false");
  Assert.equal(got.message.alreadyOpen, false, "should not indicate that its already open");

  // Now add a room & check it.
  let ROOM_TOKEN2 = "42";
  // var originalRoomList = new Map([[ROOM_TOKEN2, { roomToken: ROOM_TOKEN2 }]]);

  let withOutParticipants = new Map([[ROOM_TOKEN2, {
    roomToken: ROOM_TOKEN2,
    participants: [{
      roomConnectionId: "3ff0a2e1-f73f-43c6-bb4f-154cc847xy1a",
      displayName: "Guest",
      account: "fake.user@null.com",
      owner: true
    }]
  }
  ]]);
  let withParticipants = new Map([[ROOM_TOKEN2, {
    roomToken: ROOM_TOKEN2,
    participants: [{
      roomConnectionId: "3ff0a2e1-f73f-43c6-bb4f-154cc847xy1a",
      displayName: "Guest",
      account: "fake.user@null.com",
      owner: true
    }, {
      roomConnectionId: "3ff0a2e1-f73f-43c6-bb4f-123456789112",
      displayName: "Guest",
      owner: false
    }]
  }
  ]]);

  LoopRooms._setRoomsCache(fakeRoomList);
  registerCleanupFunction(() => {
    LoopRooms._setRoomsCache();
  });

  got = yield promiseNewChannelResponse(TEST_URI_GOOD, gGoodBackChannel, "openRoom");

  // Check the room was opened.
  Assert.ok(openedUrl, "should open a chat window");

  let windowId = openedUrl.match(/about:loopconversation\#(\w+)$/)[1];
  let windowData = MozLoopService.getConversationWindowData(windowId);

  Assert.equal(windowData.type, "room", "window data should contain room as the type");
  Assert.equal(windowData.roomToken, ROOM_TOKEN2, "window data should have the roomToken");

  Assert.equal(got.message.response, true, "should have got a response of true");
  Assert.equal(got.message.alreadyOpen, false, "should not indicate that its already open");

  const kBrowserSharingNotificationId = "loop-sharing-notification";

  // place owner in room
  LoopRooms._setRoomsCache(withOutParticipants, fakeRoomList);
  got = yield promiseNewChannelResponse(TEST_URI_GOOD, gGoodBackChannel, "openRoom");

  console.log("got.message", got.message);
  console.log("got.message.response", got.message.response);
  // First we add two tabs.
  yield promiseWindowIdReceivedNewTab();
  yield promiseWindowIdReceivedNewTab();
  Assert.strictEqual(gBrowser.selectedTab, createdTabs[1],
    "The second tab created should be selected now");

  // Add one sharing listener, which should show the infobar.
  yield promiseWindowIdReceivedOnAdd(handlers[0]);

  let getInfoBar = function() {
    let box = gBrowser.getNotificationBox(gBrowser.selectedBrowser);
    return box.getNotificationWithValue(kBrowserSharingNotificationId);
  };

  let testBarProps = function() {
    let bar = getInfoBar();
    // Start with some basic assertions for the bar.
    Assert.ok(bar, "The notification bar should be visible");
    Assert.strictEqual(bar.hidden, false, "Again, the notification bar should be visible");

    // Message label
    Assert.equal(bar.label, getLoopString("infobar_screenshare_no_guest_message"), "The bar label should match");

    // Pause button and type
    let button = bar.querySelector(".notification-button");
    Assert.ok(button, "There should be a button present");
    Assert.equal(button.type, "pause", "The bar button should be type pause");

    // Paused state and label message
    button.click();
    Assert.equal(bar.label, getLoopString("infobar_screenshare_stop_no_guest_message"), "The bar label should match when paused");

    // Add a participant to the room and check message
    LoopRooms._setRoomsCache(withParticipants, withOutParticipants);
    // for some reason the yield is reserved and fails eslint
    // got = yield promiseNewChannelResponse(TEST_URI_GOOD, gGoodBackChannel, "openRoom");
    // console.log("got.message", got.message);
    // console.log("got.message.response", got.message.response);

    Assert.equal(bar.label, getLoopString("infobar_screenshare_stop_sharing_message2"), "The bar label should match when paused and guest in room");

    button.click();
    Assert.equal(bar.label, getLoopString("infobar_screenshare_browser_message2"), "The bar label should match when guest in room");

  };

  testBarProps();

  // When we switch tabs, the infobar should move along with it. We use `selectedIndex`
  // here, because that's the setter that triggers the 'select' event. This event
  // is what LoopUI listens to and moves the infobar.
  gBrowser.selectedIndex = Array.indexOf(gBrowser.tabs, createdTabs[0]);

  // We now know that the second tab is selected and should be displaying the
  // infobar.
  testBarProps();

  // Test hiding the infoBar.
  getInfoBar().querySelector(".notification-button-default").click();
  Assert.equal(getInfoBar(), null, "The notification should be hidden now");

  gBrowser.selectedIndex = Array.indexOf(gBrowser.tabs, createdTabs[1]);

  Assert.equal(getInfoBar(), null, "The notification should still be hidden");

  // Cleanup.
  for (let listenerId of listenerIds) {
    gHandlers.RemoveBrowserSharingListener({ data: [listenerId] }, function() {});
  }
  yield removeTabs();

  // Simulate a window already being open.
  MozLoopServiceInternal.mocks.isChatWindowOpen = true;

  got = yield promiseNewChannelResponse(TEST_URI_GOOD, gGoodBackChannel, "openRoom");

  Assert.equal(got.message.response, true, "should have got a response of true");
  Assert.equal(got.message.alreadyOpen, true, "should indicate the room is already open");
});
