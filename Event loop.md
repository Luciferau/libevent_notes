# run loop
一旦有了一个已经注册了某些事件的event_base，就需要让libevent等待事件并且通知事件的发生。
## API
```c
int event_base_loop(struct event_base *, int);
```


```c
  

/** @name Loop flags

  

    These flags control the behavior of event_base_loop().

 */

/**@{*/

/** Block until we have an active event, then exit once all active events

 * have had their callbacks run. */

#define EVLOOP_ONCE  0x01

/** Do not block: see which events are ready now, run the callbacks

 * of the highest-priority ones, then exit. */

#define EVLOOP_NONBLOCK 0x02

/** Do not exit the loop because we have no pending events.  Instead, keep

 * running until event_base_loopexit() or event_base_loopbreak() makes us

 * stop.

 */

#define EVLOOP_NO_EXIT_ON_EMPTY 0x04

/**@}*/
```
默认情况下，<font color="#4bacc6">event_base_loop（）</font>函数运行<font color="#4f81bd">event_base</font>直到其中没有已经注册的事件为止。执行循环的时候，函数重复地检查是否有任何已经注册的事件被触发（比如说，读事件的文件描述符已经就绪，可以读取了；或者超时事件的超时时间即将到达）。如果有事件被触发，函数标记被触发的事件为“激活的”，并且执行这些事件。

在<font color="#00b050">flags</font>参数中设置一个或者多个标志就可以改变<font color="#4bacc6">event_base_loop（）</font>的行为。如果设置了<font color="#8064a2">EVLOOP_ONCE</font>，循环将等待某些事件成为激活的，执行激活的事件直到没有更多的事件可以执行，然会返回。如果设置了<font color="#8064a2">EVLOOP_NONBLOCK</font>，循环不会等待事件被触发：循环将仅仅检测是否有事件已经就绪，可以立即触发，如果有，则执行事件的回调。

完成工作后，如果正常退出，<font color="#4bacc6">event_base_loop（）</font>返回0；如果因为后端中的某些未处理错误而退出，则返回-1。