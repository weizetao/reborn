package models

import (
	"bytes"
	"crypto/md5"
	"encoding/base64"
	"encoding/binary"
	"fmt"
	"github.com/juju/errors"
	"hash/crc32"
	"strings"
	"time"
)

const (
	RDONLY int8 = 0
	RDWR   int8 = 1
)

type AccessObj struct {
	ID           int32  `json:"id"`           // access id
	Mode         int8   `json:"mode"`         // read/write permission mode
	ExpireTimeAt int64  `json:"expireTimeAt"` //
	NameSpace    []byte `json:"-"`
	NameSpaceStr string `json:"nameSpace"`
}

func (this *AccessObj) IsExpired() bool {
	if this.ExpireTimeAt == 0 {
		return false
	}
	if this.ExpireTimeAt > time.Now().Unix() {
		return false
	}
	return true
}

func base64Encode(b []byte) string {
	s64 := base64.URLEncoding.EncodeToString(b)

	return strings.Replace(s64, "=", "", -1)
}

func base64Decode(str string) ([]byte, error) {
	x := len(str) * 3 % 4
	switch {
	case x == 2:
		str += "=="
	case x == 1:
		str += "="
	}
	return base64.URLEncoding.DecodeString(str)
}

// key = base64( expireTimeAt + accessID + mode + confuseKey )
func AccessKeyEncode(secrectKey string, accessID int32, mode int8, expireTimeAt int64) (string, error) {
	var buf bytes.Buffer
	if expireTimeAt != 0 && expireTimeAt < time.Now().Unix() {
		return "", errors.New("ERR: expireTimeAt already expired!")
	}
	binary.Write(&buf, binary.BigEndian, expireTimeAt)
	binary.Write(&buf, binary.BigEndian, accessID)
	binary.Write(&buf, binary.BigEndian, mode)

	var hashChannel = make(chan []byte, 32)
	a := md5.Sum(buf.Bytes())
	b := md5.Sum([]byte(secrectKey))
	hashChannel <- a[0:8]
	hashChannel <- b[8:16]
	confuseKey := crc32.ChecksumIEEE(<-hashChannel)

	binary.BigEndian.PutUint32(buf.Bytes()[0:4], binary.BigEndian.Uint32(buf.Bytes()[0:4])^confuseKey)
	binary.BigEndian.PutUint32(buf.Bytes()[4:8], binary.BigEndian.Uint32(buf.Bytes()[4:8])^confuseKey)
	binary.BigEndian.PutUint32(buf.Bytes()[8:12], binary.BigEndian.Uint32(buf.Bytes()[8:12])^confuseKey)

	binary.Write(&buf, binary.BigEndian, confuseKey)

	return base64Encode(buf.Bytes()), nil
}

func AccessObjEncode(secrectKey string, ac *AccessObj) (string, error) {
	return AccessKeyEncode(secrectKey, ac.ID, ac.Mode, ac.ExpireTimeAt)
}

func AccessKeyDecode(secrectKey string, key string) (*AccessObj, error) {

	s, err := base64Decode(key)
	if err != nil {
		return nil, errors.Trace(err)
	}

	if len(s) < 17 {
		return nil, errors.New("ERR invalid AccessKey")
	}

	confuseKey := binary.BigEndian.Uint32(s[13:17])
	binary.BigEndian.PutUint32(s[0:4], binary.BigEndian.Uint32(s[0:4])^confuseKey)
	binary.BigEndian.PutUint32(s[4:8], binary.BigEndian.Uint32(s[4:8])^confuseKey)
	binary.BigEndian.PutUint32(s[8:12], binary.BigEndian.Uint32(s[8:12])^confuseKey)

	var hashChannel = make(chan []byte, 32)
	a := md5.Sum(s[0:13])
	b := md5.Sum([]byte(secrectKey))
	hashChannel <- a[0:8]
	hashChannel <- b[8:16]
	confuseKey2 := crc32.ChecksumIEEE(<-hashChannel)

	if confuseKey != confuseKey2 {
		return nil, errors.New("ERR invalid AccessKey")
	}
	var ac AccessObj
	ac.ExpireTimeAt = int64(binary.BigEndian.Uint64(s[0:8]))
	ac.ID = int32(binary.BigEndian.Uint32(s[8:12]))
	ac.NameSpaceStr = fmt.Sprintf("%08x", ac.ID)
	ac.NameSpace = []byte(ac.NameSpaceStr)
	ac.Mode = int8(s[12])
	if ac.IsExpired() {
		return &ac, errors.New("ERR AccessKey is expired")
	}
	return &ac, nil
}

func NewDefaultAccessObj() *AccessObj {
	return &AccessObj{
		ID:           0,
		Mode:         RDWR,
		ExpireTimeAt: 0,
		NameSpace:    []byte("00000000"),
	}
}
func NewEmptyAccessObj() *AccessObj {
	return &AccessObj{
		ID:           0,
		Mode:         RDWR,
		ExpireTimeAt: 0,
		NameSpace:    []byte(""),
	}
}
