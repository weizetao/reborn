// Copyright 2016  weizetao. All Rights Reserved.
// Copyright 2015 Reborndb Org. All Rights Reserved.
// Licensed under the MIT (MIT-LICENSE.txt) license.

package main

import (
	"fmt"
	"strconv"
	"time"

	"github.com/docopt/docopt-go"
	"github.com/juju/errors"
	"github.com/ngaut/log"
	"github.com/reborndb/reborn/pkg/models"
)

func cmdAccess(argv []string) (err error) {
	usage := `usage:
	reborn-config access encode <id> <mode> <expire>
	reborn-config access decode <ackey>
`
	args, err := docopt.Parse(usage, argv, true, "", false)
	if err != nil {
		log.Error(err)
		return errors.Trace(err)
	}
	log.Debug(args)

	if args["encode"].(bool) {
		accessID, err := strconv.Atoi(args["<id>"].(string))
		if err != nil {
			return errors.Trace(err)
		}

		mode, err := strconv.Atoi(args["<mode>"].(string))
		if err != nil {
			return errors.Trace(err)
		}
		expire, err := strconv.ParseInt(args["<expire>"].(string), 10, 64)
		if err != nil {
			return errors.Trace(err)
		}
		return runEncodeAccessKey(accessID, mode, expire)
	}
	if args["decode"].(bool) {
		ackey := args["<ackey>"].(string)
		return runDecodeAccessKey(ackey)
	}
	return nil
}

func runEncodeAccessKey(accessID int, mode int, expire int64) error {
	if expire > 0 {
		expire += time.Now().Unix()
	}
	ak, err := models.AccessKeyEncode(globalEnv.ProxyAuth(), int32(accessID), int8(mode), expire)
	if err != nil {
		return errors.Trace(err)
	}
	fmt.Println(ak)
	return nil
}

func runDecodeAccessKey(ackey string) error {
	ac, err := models.AccessKeyDecode(globalEnv.ProxyAuth(), ackey)
	if err != nil {
		fmt.Println(err)
		if ac != nil {
			fmt.Println(jsonify(ac))
		}
	} else {
		fmt.Println(jsonify(ac))
	}

	return nil
}
