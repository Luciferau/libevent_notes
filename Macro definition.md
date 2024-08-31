# event_loop flag

## <font color="#8064a2">EVLOOP_ONCE</font> <font color="#8064a2">EVLOOP_NONBLOCK</font> <font color="#8064a2">EVLOOP_NO_EXIT_ON_EMPTY</font>

这三个也是 <font color="#4bacc6">event_base_loop()</font>的flag参数
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

- **`EVLOOP_ONCE` (0x01)**:
    
    - **含义**: 运行事件循环一次。即，阻塞直到有活动事件发生，然后在处理完所有活动事件的回调后退出循环。
    - **行为**: 当设置了这个标志时，事件循环将会一直阻塞，直到有一个或多个事件变为活动状态。一旦事件的回调函数被处理完，循环将会退出。适用于你希望事件循环处理完所有活动事件后立即退出的场景。
- **`EVLOOP_NONBLOCK` (0x02)**:
    
    - **含义**: 不进行阻塞检查。即，不等待新的事件发生，而是检查当前事件的状态，处理那些已经就绪的事件，然后退出循环。
    - **行为**: 当设置了这个标志时，事件循环不会阻塞。如果没有活动事件，事件循环将会快速退出。这适用于你希望在检查事件状态后立即退出的场景，例如周期性检查或非阻塞操作。
- **`EVLOOP_NO_EXIT_ON_EMPTY` (0x04)**:
    
    - **含义**: 即使没有待处理的事件，也不要退出循环。事件循环将会继续运行，直到调用 `event_base_loopexit()` 或 `event_base_loopbreak()` 使其停止。
    - **行为**: 当设置了这个标志时，事件循环即使在没有活动事件的情况下也不会退出。它将继续运行，直到显式地要求它退出。这适用于需要长期运行的事件循环，直到收到特定的退出命令。