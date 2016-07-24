package models

import (
	. "gopkg.in/check.v1"
	"time"
)

const (
	secrectKey = "Jdjcusk739jcdj"
)

// Test accesskey encoding
func (s *testModelSuite) Test_AccessKey(c *C) {

	k, err := AccessKeyEncode(secrectKey, 13, RDONLY, 0)
	c.Assert(err, IsNil)
	c.Logf("%s", k)
	k, err = AccessKeyEncode(secrectKey, 12, RDWR, time.Now().Unix()+1)
	c.Assert(err, IsNil)
	c.Logf("%s", k)

	ak, err := AccessKeyDecode(secrectKey, k)
	c.Assert(ak.Bucket, Equals, 12)
	c.Logf("decode %v", ak)
}
