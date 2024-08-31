# run loop
一旦有了一个已经注册了某些事件的event_base，就需要让libevent等待事件并且通知事件的发生。
## event_base_loop()
```c
int event_base_loop(struct event_base *, int);
```

### source code
相关宏定义见：[[Macro definition]]
相关宏函数见：[[Macro function]]
	<font color="#8064a2">EVBASE_ACQUIRE_LOCK</font>
<font color="#8064a2">N_ACTIVE_CALLBACKS</font>
```c

int
event_base_loop(struct event_base *base, int flags)
{
	const struct eventop *evsel = base->evsel;  // 获取事件操作接口
	struct timeval tv;  // 用于存储超时时间
	struct timeval *tv_p;  // 超时时间指针
	int res, done, retval = 0;  // 返回值、循环控制标志和结果状态

	/* 获取锁，以确保线程安全。将在 evsel.dispatch 内部释放锁 */
	EVBASE_ACQUIRE_LOCK(base, th_base_lock);

	if (base->running_loop) {  // 检查是否已有循环在运行
		event_warnx("%s: reentrant invocation.  Only one event_base_loop"
		    " can run on each event_base at once.", __func__);
		EVBASE_RELEASE_LOCK(base, th_base_lock);  // 释放锁
		return -1;  // 返回错误
	}

	base->running_loop = 1;  // 标记循环正在运行

	clear_time_cache(base);  // 清理时间缓存

	if (base->sig.ev_signal_added && base->sig.ev_n_signals_added)  // 如果有信号事件，设置信号基础
		evsig_set_base_(base);

	done = 0;  // 初始化循环终止标志

#ifndef EVENT__DISABLE_THREAD_SUPPORT
	base->th_owner_id = EVTHREAD_GET_ID();  // 设置线程所有者ID
#endif

	base->event_gotterm = base->event_break = 0;  // 初始化事件终止和中断标志

	while (!done) {  // 循环直到 done 为真
		base->event_continue = 0;  // 初始化继续标志
		base->n_deferreds_queued = 0;  // 初始化延迟队列计数

		/* 检查是否需要终止循环 */
		if (base->event_gotterm) {
			break;
		}

		if (base->event_break) {
			break;
		}

		tv_p = &tv;  // 设置超时指针
		if (!N_ACTIVE_CALLBACKS(base) && !(flags & EVLOOP_NONBLOCK)) {  // 如果没有活动回调且非非阻塞标志
			timeout_next(base, &tv_p);  // 获取下一个超时时间
		} else {
			/* 如果有活动事件，直接轮询而不等待 */
			evutil_timerclear(&tv);  // 清除时间
		}

		/* 如果没有事件，并且不允许在空状态下退出，则退出 */
		if (0==(flags&EVLOOP_NO_EXIT_ON_EMPTY) &&
		    !event_haveevents(base) && !N_ACTIVE_CALLBACKS(base)) {
			event_debug(("%s: no events registered.", __func__));
			retval = 1;  // 设置结果状态为1
			goto done;  // 跳转到清理部分
		}

		event_queue_make_later_events_active(base);  // 激活稍后的事件

		clear_time_cache(base);  // 再次清理时间缓存

		res = evsel->dispatch(base, tv_p);  // 调用事件调度函数

		if (res == -1) {  // 检查调度函数是否成功
			event_debug(("%s: dispatch returned unsuccessfully.",
				__func__));
			retval = -1;  // 设置结果状态为-1
			goto done;  // 跳转到清理部分
		}

		update_time_cache(base);  // 更新时间缓存

		timeout_process(base);  // 处理超时事件

		if (N_ACTIVE_CALLBACKS(base)) {  // 如果有活动回调
			int n = event_process_active(base);  // 处理活动回调
			if ((flags & EVLOOP_ONCE)  // 如果是一次性循环
			    && N_ACTIVE_CALLBACKS(base) == 0
			    && n != 0)
				done = 1;  // 设置循环结束标志
		} else if (flags & EVLOOP_NONBLOCK)
			done = 1;  // 如果是非阻塞标志，结束循环
	}
	event_debug(("%s: asked to terminate loop.", __func__));

done:
	clear_time_cache(base);  // 清理时间缓存
	base->running_loop = 0;  // 标记循环已结束

	EVBASE_RELEASE_LOCK(base, th_base_lock);  // 释放锁

	return (retval);  // 返回最终结果
}

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
## pseudo-code
 
![[Pasted image 20240831141854.png]]
## <font color="#4bacc6">event_base_dispatch()</font>

```c
int

event_base_dispatch(struct event_base *event_base)

{

    return (event_base_loop(event_base, 0));

}
```
