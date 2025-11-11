// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as assert from "assert";
import * as security from "../script/utils/security";

describe("Security Features", () => {
  it("do not allow accessKey from starting with '-'", () => {
    var userId = "DummyAccnt1";
    for (var i = 0; i < 10; i++) {
      var accessKey: string = security.generateSecureKey(userId);
      assert.notEqual("-", accessKey.charAt(0));
    }
  });
});
