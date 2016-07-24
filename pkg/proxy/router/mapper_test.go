// Copyright 2015 Reborndb Org. All Rights Reserved.
// Licensed under the MIT (MIT-LICENSE.txt) license.

package router

import (
	. "gopkg.in/check.v1"
)

func (s *testProxyRouterSuite) TestMapKey2Slot(c *C) {
	index := mapKey2Slot([]byte("meta:5ba4cd7f112cf962e8359278958296fd8fb43666"))
	c.Logf("slot=%d", index)
	// table := []string{"123{xxx}abc", "{xxx}aa", "x{xxx}"}
	// for _, v := range table {
	// 	c.Assert(index, Equals, mapKey2Slot([]byte(v)))
	// }
}
