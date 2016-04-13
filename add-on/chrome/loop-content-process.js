/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";


// This file is loaded as a process script, it will be loaded in the parent
// process as well as all content processes.

const { utils: Cu } = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

function oncePerProcess() {
  // XXX where do we unregister?  process shutdown observer?
  AboutLoop.conversation.register();
  AboutLoop.panel.register();
}

oncePerProcess();
