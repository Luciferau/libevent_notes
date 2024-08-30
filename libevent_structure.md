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
## struct <font color="#4bacc6">event_base</font>
```c
struct event_base {
	//一个指向特定于后端数据的指针，用于描述这个event_base端。
	const struct eventop *evsel;
	//一个指向特定于后端数据的指针，用于指向底层事件驱动后端的实现。
	void *evbase;

	/** List of changes to tell backend about at next dispatch.  Only used
	 * by the O(1) backends. */
    
    //一个结构体，用于描述在下次调度时需要通知后端更改的事件
	struct event_changelist changelist;
	
	/** Function pointers used to describe the backend that this event_base
	 * uses for signals */
    
    //一个指向特定于信号处理后端数据的指针，用于描述后端event_base*用于信号处理。
	const struct eventop *evsigsel;
    
	/** Data to implement the common signal handler code. */
    //一个结构体，用于实现信号处理通用代码的数据。
	struct evsig_info sig;

	/** Number of virtual events */
    //用于表示当前虚拟事件数量。
	int virtual_event_count;
    
	/** Maximum number of virtual events active */
    //用于表示最大虚拟事件数量。
	int virtual_event_count_max;
    
	/** Number of total events added to this event_base */
    //用于表示已添加到event_base的事件数量。
	int event_count;
    
	/** Maximum number of total events added to this event_base */
    //用于表示最大已添加到event_base的事件数量。
	int event_count_max;
    
	/** Number of total events active in this event_base */
    //用于表示当前活动事件数量。
	int event_count_active;
    
	/** Maximum number of total events active in this event_base */
    //用于表示最大活动事件数量。
	int event_count_active_max;

	/** Set if we should terminate the loop once we're done processing
	 * events. */
    //用于表示是否应该在处理完事件后终止循环。
	int event_gotterm;
    
	/** Set if we should terminate the loop immediately */
	
    //用于表示是否应该立即终止循环。
	int event_break;
    
	/** Set if we should start a new instance of the loop immediately. */
    //用于表示是否应该在处理完事件后继续执行循环。
	int event_continue;

	/** The currently running priority of events */
    //用于表示当前正在运行的事件优先级。
	int event_running_priority;

	/** Set if we're running the event_base_loop function, to prevent
	 * reentrant invocation. */
    //用于表示是否正在运行event_base_loop函数，以防止重入调用。
	int running_loop;

	/** Set to the number of deferred_cbs we've made 'active' in the
	 * loop.  This is a hack to prevent starvation; it would be smarter
	 * to just use event_config_set_max_dispatch_interval's max_callbacks
	 * feature */
    //用于表示已 deferred_cbs 数量
	int n_deferreds_queued;

	/* Active event management. */
	/** An array of nactivequeues queues for active event_callbacks (ones
	 * that have triggered, and whose callbacks need to be called).  Low
	 * priority numbers are more important, and stall higher ones.
	 */
    //用于存储活动事件队列。
	struct evcallback_list *activequeues;
	/** The length of the activequeues array */
	int nactivequeues;//用于表示活动事件队列的数量。
	/** A list of event_callbacks that should become active the next time
	 * we process events, but not this time. */
    //于存储应该在下次处理事件时激活的事件。
	struct evcallback_list active_later_queue;

	/* common timeout logic */

	/** An array of common_timeout_list* for all of the common timeout
	 * values we know. */
    //用于存储所有已知的时间outs。
	struct common_timeout_list **common_timeout_queues;

    /** The number of entries used in common_timeout_queues */
    //用于表示已使用的时间outs数量。
	int n_common_timeouts;
    
	/** The total size of common_timeout_queues. */
    //用于表示已分配的时间outs数量。
	int n_common_timeouts_allocated;

	/** Mapping from file descriptors to enabled (added) events */
    //用于存储文件描述符到已添加事件的映射。
	struct event_io_map io;

	/** Mapping from signal numbers to enabled (added) events. */
    //用于存储信号编号到已添加事件的映射。
	struct event_signal_map sigmap;

	/** Priority queue of events with timeouts. */
    //1个优先队列，用于存储具有超时的事件。
	struct min_heap timeheap;

	/** Stored timeval: used to avoid calling gettimeofday/clock_gettime
	 * too often. */
    //用于存储当前时间，以避免频繁调用gettimeofday/clock_gettime。
	struct timeval tv_cache;
	
    //，用于实现单调时钟。
	struct evutil_monotonic_timer monotonic_timer;

	/** Difference between internal time (maybe from clock_gettime) and
	 * gettimeofday. */
    //用于存储内部时间与gettimeofday之间的差异。
	struct timeval tv_clock_diff;
    
	/** Second in which we last updated tv_clock_diff, in monotonic time. */
    //用于存储上次更新tv_clock_diff时的单调时间。
	time_t last_updated_clock_diff;

#ifndef EVENT__DISABLE_THREAD_SUPPORT
	/* threading support */
	/** The thread currently running the event_loop for this base */
	unsigned long th_owner_id;
	/** A lock to prevent conflicting accesses to this event_base */
	void *th_base_lock;
	/** A condition that gets signalled when we're done processing an
	 * event with waiters on it. */
	void *current_event_cond;
	/** Number of threads blocking on current_event_cond. */
	int current_event_waiters;
#endif
	/** The event whose callback is executing right now */
	struct event_callback *current_event;

#ifdef _WIN32
	/** IOCP support structure, if IOCP is enabled. */
    /**：一个指向`event_iocp_port`结构体的指针，如果在Windows平台上使用IOCP（I/O Completion Port）作为事件驱动后端，则使用此字段。
*/
	struct event_iocp_port *iocp;
#endif

	/** Flags that this base was configured with */
    //`flags`：一个枚举类型，用于表示`event_base`的配置标志。
    
	enum event_base_config_flag flags;
	
    //，用于表示最大调度时间。
	struct timeval max_dispatch_time;
    
	int max_dispatch_callbacks;//用于表示最大调度回调数量。
	int limit_callbacks_after_prio;//用于表示在达到特定优先级后限制回调数量。

	/* Notify main thread to wake up break, etc. */
	/** True if the base already has a pending notify, and we don't need
	 * to add any more. */
	int is_notify_pending;//用于表示`event_base`是否已经有一个待处理的通知。
	/** A socketpair used by some th_notify functions to wake up the main
	 * thread. */
    
    //用于free base
	evutil_socket_t th_notify_fd[2];//一个套接字对，用于在另一个线程中唤醒主线程。
	/** An event used by some th_notify functions to wake up the main
	 * thread. */
    
	struct event th_notify;//用于在主线程中唤醒其他线程。

	/** A function used to wake up the main thread from another thread. */
    /**`th_notify`：一个`event`结构体，用于在主线程中唤醒其他线程。*/
	int (*th_notify_fn)(struct event_base *base);

	/** Saved seed for weak random number generator. Some backends use
	 * this to produce fairness among sockets. Protected by th_base_lock. */
    //一个`evutil_weakrand_state`结构体，用于存储弱随机数生成器的种子。
	struct evutil_weakrand_state weakrand_seed;

	/** List of event_onces that have not yet fired. */
    /**`once_events`：一个`LIST_HEAD`结构体，用于存储尚未触发的事件。*/
	LIST_HEAD(once_event_list, event_once) once_events;

};

```

| **参数名称**                      | **类型**                                   | **意义**                                         |
| ----------------------------- | ---------------------------------------- | ---------------------------------------------- |
| `evsel`                       | `const struct eventop *`                 | 指向特定于后端数据的指针，用于描述 `event_base` 端。              |
| `evbase`                      | `void *`                                 | 指向特定于后端数据的指针，用于指向底层事件驱动后端的实现。                  |
| `changelist`                  | `struct event_changelist`                | 描述在下次调度时需要通知后端更改的事件。                           |
| `evsigsel`                    | `const struct eventop *`                 | 指向特定于信号处理后端数据的指针，用于描述信号处理。                     |
| `sig`                         | `struct evsig_info`                      | 实现信号处理通用代码的数据。                                 |
| `virtual_event_count`         | `int`                                    | 当前虚拟事件的数量。                                     |
| `virtual_event_count_max`     | `int`                                    | 最大虚拟事件的数量。                                     |
| `event_count`                 | `int`                                    | 已添加到 `event_base` 的事件数量。                       |
| `event_count_max`             | `int`                                    | 最大已添加到 `event_base` 的事件数量。                     |
| `event_count_active`          | `int`                                    | 当前活动事件的数量。                                     |
| `event_count_active_max`      | `int`                                    | 最大活动事件的数量。                                     |
| `event_gotterm`               | `int`                                    | 是否应在处理完事件后终止循环。                                |
| `event_break`                 | `int`                                    | 是否应立即终止循环。                                     |
| `event_continue`              | `int`                                    | 是否应在处理完事件后继续执行循环。                              |
| `event_running_priority`      | `int`                                    | 当前正在运行的事件优先级。                                  |
| `running_loop`                | `int`                                    | 是否正在运行 `event_base_loop` 函数，以防止重入调用。           |
| `n_deferreds_queued`          | `int`                                    | 已 `deferred_cbs` 数量，用于防止饥饿。                    |
| `activequeues`                | `struct evcallback_list *`               | 存储活动事件队列。                                      |
| `nactivequeues`               | `int`                                    | 活动事件队列的数量。                                     |
| `active_later_queue`          | `struct evcallback_list`                 | 存储应该在下次处理事件时激活的事件。                             |
| `common_timeout_queues`       | `struct common_timeout_list **`          | 存储所有已知的时间timeouts(以下简写outs。                    |
| `n_common_timeouts`           | `int`                                    | 已使用的时间outs 数量。                                 |
| `n_common_timeouts_allocated` | `int`                                    | 已分配的时间outs 数量。                                 |
| `io`                          | `struct event_io_map`                    | 存储文件描述符到已添加事件的映射。                              |
| `sigmap`                      | `struct event_signal_map`                | 存储信号编号到已添加事件的映射。                               |
| `timeheap`                    | `struct min_heap`                        | 存储具有超时的事件的优先队列。                                |
| `tv_cache`                    | `struct timeval`                         | 存储当前时间，以避免频繁调用 `gettimeofday/clock_gettime`。   |
| `monotonic_timer`             | `struct evutil_monotonic_timer`          | 用于实现单调时钟。                                      |
| `tv_clock_diff`               | `struct timeval`                         | 存储内部时间与 `gettimeofday` 之间的差异。                  |
| `last_updated_clock_diff`     | `time_t`                                 | 上次更新 `tv_clock_diff` 时的单调时间。                   |
| `th_owner_id`                 | `unsigned long`                          | 当前运行 `event_loop` 的线程 ID。                      |
| `th_base_lock`                | `void *`                                 | 防止对 `event_base` 的冲突访问的锁。                      |
| `current_event_cond`          | `void *`                                 | 当处理完事件后，通知有等待的线程的条件变量。                         |
| `current_event_waiters`       | `int`                                    | 在 `current_event_cond` 上阻塞的线程数量。               |
| `current_event`               | `struct event_callback *`                | 当前正在执行其回调的事件。                                  |
| `iocp`                        | `struct event_iocp_port *`               | 如果在 Windows 上使用 IOCP，指向 `event_iocp_port` 结构体。 |
| `flags`                       | `enum event_base_config_flag`            | 表示 `event_base` 的配置标志。                         |
| `max_dispatch_time`           | `struct timeval`                         | 最大调度时间。                                        |
| `max_dispatch_callbacks`      | `int`                                    | 最大调度回调数量。                                      |
| `limit_callbacks_after_prio`  | `int`                                    | 在达到特定优先级后限制回调数量。                               |
| `is_notify_pending`           | `int`                                    | 是否已经有待处理的通知。                                   |
| `th_notify_fd`                | `evutil_socket_t[2]`                     | 一个套接字对，用于唤醒主线程。                                |
| `th_notify`                   | `struct event`                           | 用于在主线程中唤醒其他线程的事件。                              |
| `th_notify_fn`                | `int (*)(struct event_base *base)`       | 用于从另一个线程唤醒主线程的函数。                              |
| `weakrand_seed`               | `struct evutil_weakrand_state`           | 存储弱随机数生成器的种子。                                  |
| `once_events`                 | `LIST_HEAD(once_event_list, event_once)` | 存储尚未触发的事件。                                     |
## struct <font color="#4bacc6">eventop</font>
