# run loop
一旦有了一个已经注册了某些事件的event_base，就需要让libevent等待事件并且通知事件的发生。
## API

```c
int event_base_loop(struct event_base *, int);
```