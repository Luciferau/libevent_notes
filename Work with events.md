libevent的基本操作单元是事件。每个事件代表一组条件的集合，这些条件包括：
- 文件描述符已经就绪，可以读取或者写入

- 文件描述符变为就绪状态，可以读取或者写入（仅对于边沿触发IO）
- 超时事件

- 发生某信号

- 用户触发事件
所有事件具有相似的生命周期。调用libevent函数设置事件并且关联到event_base之后，事件进入“**已初始化（initialized）**”状态。此时可以将事件添加到<font color="#4bacc6">event_base</font>中，这使之进入“**未决（pending）**”状态。在未决状态下，如果触发事件的条件发生（比如说，文件描述符的状态改变，或者超时时间到达），则事件进入“**激活（active）**”状态，（用户提供的）事件回调函数将被执行。如果配置为“**持久的（persistent）**”，事件将保持为未决状态。否则，执行完回调后，事件不再是未决的。删除操作可以让未决事件成为非未决（已初始化）的；添加操作可以让非未决事件再次成为未决的。

# Create event
使用<font color="#4bacc6">event_new（）</font>接口创建事件。
~~~c
struct event * event_new(struct event_base *base, evutil_socket_t fd, short events, void (*cb)(evutil_socket_t, short, void *), void *arg)

~~~

```c
struct event * event_new(struct event_base *base, evutil_socket_t fd, short events, void (*cb)(evutil_socket_t, short, void *), void *arg)

{
    struct event *ev;
    ev = mm_malloc(sizeof(struct event));
    if (ev == NULL)
        return (NULL);
    if (event_assign(ev, base, fd, events, cb, arg) < 0) {
        mm_free(ev);
        return (NULL);
    }
    return (ev);
}
```
