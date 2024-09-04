![Pasted image 20240904090807](images/Pasted%20image%2020240904090807.png)
 
# Create <font color="#ffff00">event</font>

event support 相关宏见：[Macro definition](Macro%20definition.md)

~~~c
typedef void (*event_callback_fn)(evutil_socket_t, short, void *);
void event_free(struct event *ev)
~~~
## source code
### <font color="#4bacc6">event_new()</font>
~~~c
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

  

void event_free(struct event *ev)

{

    /* This is disabled, so that events which have been finalized be a

     * valid target for event_free(). That's */

    // event_debug_assert_is_setup_(ev);

  

    /* make sure that this event won't be coming back to haunt us. */

    event_del(ev);

    event_debug_note_teardown_(ev);

    mm_free(ev);

  

}
~~~
<font color="#4bacc6">event_new()</font>试图分配和构造一个用于base的新的事件。what参数是上述标志的集合。如果fd非负，则它是将被观察其读写事件的文件。事件被激活时，libevent将调用cb函数，传递这些参数：文件描述符fd，表示所有被触发事件的位字段，以及构造事件时的arg参数。

发生内部错误，或者传入无效参数时，event_new（）将返回NULL。

所有新创建的事件都处于已初始化和非未决状态，调用event_add（）可以使其成为未决的。

要释放事件，调用event_free（）。对未决或者激活状态的事件调用event_free（）是安全的：在释放事件之前，函数将会使事件成为非激活和非未决的。

## example
![[Pasted image 20240904090807.png]]
 
上述函数定义在<event2/event.h>中，首次出现在libevent 2.0.1-alpha版本中。event_callback_fn类型首次在2.0.4-alpha版本中作为typedef出现。

# Event flag
事件标志见：[[Macro definition]]


# Only timeout <font color="#f79646">events</font>

为使用方便，libevent提供了一些以evtimer_开头的宏，用于替代event_*调用来操作纯超时事件。使用这些宏能改进代码的清晰性。


![[Pasted image 20240904092035.png]]

## <font color="#4bacc6">event_assign()</font>
~~~c
  

int

event_assign(struct event *ev, struct event_base *base, evutil_socket_t fd, short events, void (*callback)(evutil_socket_t, short, void *), void *arg)

{

    if (!base)

        base = current_base;

    if (arg == &event_self_cbarg_ptr_)

        arg = ev;

  

    if (!(events & EV_SIGNAL))

        event_debug_assert_socket_nonblocking_(fd);

    event_debug_assert_not_added_(ev);
  
    ev->ev_base = base;  

    ev->ev_callback = callback;

    ev->ev_arg = arg;

    ev->ev_fd = fd;

    ev->ev_events = events;

    ev->ev_res = 0;

    ev->ev_flags = EVLIST_INIT;

    ev->ev_ncalls = 0;

    ev->ev_pncalls = NULL;

  

    if (events & EV_SIGNAL) {

        if ((events & (EV_READ|EV_WRITE|EV_CLOSED)) != 0) {

            event_warnx("%s: EV_SIGNAL is not compatible with "

                "EV_READ, EV_WRITE or EV_CLOSED", __func__);

            return -1;

        }

        ev->ev_closure = EV_CLOSURE_EVENT_SIGNAL;

    } else {

        if (events & EV_PERSIST) {

            evutil_timerclear(&ev->ev_io_timeout);

            ev->ev_closure = EV_CLOSURE_EVENT_PERSIST;

        } else {

            ev->ev_closure = EV_CLOSURE_EVENT;

        }

    }

  

    min_heap_elem_init_(ev);

  

    if (base != NULL) {

        /* by default, we put new events into the middle priority */

        ev->ev_pri = base->nactivequeues / 2;

    }

  

    event_debug_note_setup_(ev);

  

    return 0;

}
~~~


## <font color="#4bacc6">event_add()</font>
~~~c
int event_add(struct event *ev, const struct timeval *tv)

{

    int res;

  

    if (EVUTIL_FAILURE_CHECK(!ev->ev_base)) {

        event_warnx("%s: event has no event_base set.", __func__);

        return -1;

    }

  

    EVBASE_ACQUIRE_LOCK(ev->ev_base, th_base_lock);

  

    res = event_add_nolock_(ev, tv, 0);

  

    EVBASE_RELEASE_LOCK(ev->ev_base, th_base_lock);

  

    return (res);

}

~~~
## <font color="#4bacc6">event_del()</font>
~~~c
int event_del(struct event *ev)

{

    return event_del_(ev, EVENT_DEL_AUTOBLOCK);

}
~~~

![[Pasted image 20240904092708.png]]
### event_del_()
~~~c
static int event_del_(struct event *ev, int blocking)

{

    int res;

    struct event_base *base = ev->ev_base;

  

    if (EVUTIL_FAILURE_CHECK(!base)) {

        event_warnx("%s: event has no event_base set.", __func__);

        return -1;

    }

  

    EVBASE_ACQUIRE_LOCK(base, th_base_lock);

    res = event_del_nolock_(ev, blocking);

    EVBASE_RELEASE_LOCK(base, th_base_lock);

  

    return (res);

}
~~~

## event_pending()
~~~c

int event_pending(const struct event *ev, short event, struct timeval *tv)

{

    int flags = 0;

  

    if (EVUTIL_FAILURE_CHECK(ev->ev_base == NULL)) {

        event_warnx("%s: event has no event_base set.", __func__);

        return 0;

    }

  

    EVBASE_ACQUIRE_LOCK(ev->ev_base, th_base_lock);

    event_debug_assert_is_setup_(ev);

  

    if (ev->ev_flags & EVLIST_INSERTED)

        flags |= (ev->ev_events & (EV_READ|EV_WRITE|EV_CLOSED|EV_SIGNAL));

    if (ev->ev_flags & (EVLIST_ACTIVE|EVLIST_ACTIVE_LATER))

        flags |= ev->ev_res;

    if (ev->ev_flags & EVLIST_TIMEOUT)

        flags |= EV_TIMEOUT;

  

    event &= (EV_TIMEOUT|EV_READ|EV_WRITE|EV_CLOSED|EV_SIGNAL);

  

    /* See if there is a timeout that we should report */

    if (tv != NULL && (flags & event & EV_TIMEOUT)) {

        struct timeval tmp = ev->ev_timeout;

        tmp.tv_usec &= MICROSECONDS_MASK;

        /* correctly remamp to real time */

        evutil_timeradd(&ev->ev_base->tv_clock_diff, &tmp, tv);

    }

  

    EVBASE_RELEASE_LOCK(ev->ev_base, th_base_lock);

  

    return (flags & event);

}
~~~


## <font color="#4bacc6">event_initialized()</font>

~~~c
int event_initialized(const struct event *ev)
{

    if (!(ev->ev_flags & EVLIST_INIT))
        return 0;          
    return 1;

}
~~~

# Build singal event
	libevent也可以监测POSIX风格的信号。要构造信号处理器，使用：

![[Pasted image 20240904103007.png]]

~~~c
#define evsignal_new(b, x, cb, arg)          \

event_new((b), (x), EV_SIGNAL|EV_PERSIST, (cb), (arg))
~~~
除了提供一个信号编号代替文件描述符之外，各个参数与event_new（）相同。
![[Pasted image 20240904103355.png]]
<font color="#ff0000">注意</font>：信号回调是信号发生后在事件循环中被执行的，所以可以安全地调用通常不能在POSIX风格信号处理器中使用的函数。