#Access Key（AK）
Access Key，用于对客户端进行鉴权和认证，通过AUTH命令。

```
$ ../bin/reborn-config access -h
usage:
	reborn-config access encode <id> <mode> <expire>
	reborn-config access decode <ak>

```
`id` Access Key ID，可以表示不同的产品、用户

`mode` 读写权限，0-只读，1-读写

`expire` 有效时间，单位为秒，0为永久有效


#数据隔离
当用户使用AK进行认证成功后，根据Access Key ID为数据划分不同的NameSpace，不同的NameSpace的数据是相互隔离的，不会发生冲突。

只有当使用AK认证成功的用户，才会分配NameSpace。

#如何启用
* 所有的reborn-proxy 必须配置秘钥`--proxy-auth`参数。

* reborn-config的配置文件config.ini中需要配置秘钥`proxy_auth`。

* 两者配置的秘钥必须一致，否则不能认证通过。

* 建议reborn-proxy的秘钥也配置在config.ini中

config.ini的配置示例

```
$ cat config.ini
product=test
net_timeout=5
dashboard_addr=localhost:18087
coordinator_addr=localhost:2181
coordinator=zookeeper
proxy_auth=123
```
