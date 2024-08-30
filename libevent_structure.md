## struct <font color="#4bacc6">event_config_entry</font>
libevent 中的事件配置项。

通过使用 `event_config_entry` 结构体，可以在 libevent 中定义和管理多个事件配置项，并按照链表的方式进行链接和访问。每个配置项都包含一个要避免使用的网络通信方法

```c
struct event_config_entry {
	TAILQ_ENTRY(event_config_entry) next;

	const char *avoid_method;//要避免使用的网络通信方法。
};
```
TAILQ_ENTRY 见：[[macro function]]
