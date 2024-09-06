![](images/Pasted%20image%2020240904112623.png)
 libevent的基本操作单元是事件。每个事件代表一组条件的集合，这些条件包括：
- 文件描述符已经就绪，可以读取或者写入

- 文件描述符变为就绪状态，可以读取或者写入（仅对于边沿触发IO）
- 超时事件

- 发生某信号

- 用户触发事件
所有事件具有相似的生命周期。调用libevent函数设置事件并且关联到event_base之后，事件进入“**已初始化（initialized）**”状态。此时可以将事件添加到<font color="#4bacc6">event_base</font>中，这使之进入“**未决（pending）**”状态。在未决状态下，如果触发事件的条件发生（比如说，文件描述符的状态改变，或者超时时间到达），则事件进入“**激活（active）**”状态，（用户提供的）事件回调函数将被执行。如果配置为“**持久的（persistent）**”，事件将保持为未决状态
# Create <font color="#ffff00">event</font>
使用<font color="#4bacc6">event_new（）</font>接口创建事件。
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
 
![Pasted image 20240904090807](images/Pasted%20image%2020240904090807.png)

 
上述函数定义在<event2/event.h>中，首次出现在libevent 2.0.1-alpha版本中。event_callback_fn类型首次在2.0.4-alpha版本中作为typedef出现。

# Event flag
事件标志见：[Macro definition](Macro%20definition.md)


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
~~~c
struct event *

event_new(struct event_base *base, evutil_socket_t fd, short events, void (*cb)(evutil_socket_t, short, void *), void *arg)
~~~
 

~~~c
#define evsignal_new(b, x, cb, arg)          \

event_new((b), (x), EV_SIGNAL|EV_PERSIST, (cb), (arg))
~~~
除了提供一个信号编号代替文件描述符之外，各个参数与event_new（）相同。

![Pasted image 20240904103355](images/Pasted%20image%2020240904103355.png)

<font color="#ff0000">注意</font>：信号回调是信号发生后在事件循环中被执行的，所以可以安全地调用通常不能在POSIX风格信号处理器中使用的函数。

libevent也提供了一组方便使用的宏用于处理信号事件：

![Pasted image 20240904103007](images/Pasted%20image%2020240904103007.png)
evsignal_*宏从2.0.1-alpha版本开始存在。先前版本中这些宏叫做<font color="#4bacc6">signal_add（）</font><font color="#4bacc6">、signal_del（）</font>等等。

## <font color="#ff0000">关于信号的警告</font>
在当前版本的libevent和大多数后端中，每个进程任何时刻只能有一个<font color="#ff0000">event_base</font>可以监听信号。如果同时向两个event_base添加信号事件，即使是不同的信号，也只有一个event_base可以取得信号。

kqueue后端没有这个限制

# Memory management Settings do not use heap-allocated events

出于性能考虑或者其他原因，有时需要将事件作为一个大结构体的一部分。对于每个事件的使用，这可以节省：

- 内存分配器在堆上分配小对象的开销
- 对event结构体指针取值的时间开销
- 如果事件不在缓存中，因为可能的额外缓存丢失而导致的时间开销
对于大多数应用来说，这些开销是非常小的。所以，除非确定在堆上分配事件导致了严重的性能问题，应该坚持使用event_new（）。如果将来版本中的event结构体更大，不使用event_new（）可能会导致难以诊断的错误。

不在堆上分配event具有破坏与其他版本libevent二进制兼容性的风险：其他版本中的event结构体大小可能不同。

## <font color="#4bacc6">event_assign()</font>
~~~c
int event_assign(struct event *ev, struct event_base *base, evutil_socket_t fd, short events, 
				 void (*callback)(evutil_socket_t, short, void *), void *arg)

~~~
除了event参数必须指向一个未初始化的事件之外，event_assign（）的参数与event_new（）的参数相同。成功时函数返回0，如果发生内部错误或者使用错误的参数，函数返回-1。
### source code
~~~c
int event_assign(struct event *ev, struct event_base *base, evutil_socket_t fd, short events, void (*callback)(evutil_socket_t, short, void *), void *arg)

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

### example
~~~c
#include <event2/event.h>

#include <event2/event_struct.h>

#include <stdlib.h>

  

struct event_pair{

    evutil_socket_t fd;

    struct event read_event;

    struct event write_event;

};

  

void readcb(evutil_socket_t fd, short , void *);

void writecb(evutil_socket_t fd, short , void *);

  

struct event_pair * event_pair_new(struct event_base *base, evutil_socket_t fd){

    struct event_pair *pair = (struct event_pair *)malloc(sizeof(struct event_pair));

    if(!pair) return NULL;

    pair->fd = fd;

    event_assign(&pair->read_event, base, fd, EV_READ|EV_PERSIST, readcb, pair);

    event_assign(&pair->write_event, base, fd, EV_WRITE|EV_PERSIST, writecb, pair);

    return pair;

}
~~~
![](images/Pasted%20image%2020240904153038.png)

q也可以用event_assign（）初始化栈上分配的，或者静态分配的事件。
### <font color="#ffff00">Warning</font>

不要对已经在event_base中未决的事件调用event_assign（），这可能会导致难以诊断的错误。如果已经初始化和成为未决的，调用event_assign（）之前需要调用event_del（）。

libevent提供了方便的宏将event_assign（）用于仅超时事件或者信号事件。

~~~
#define evtimer_assign(ev, b, cb, arg) \

   event_assign((ev), (b), -1, 0, (cb), (arg))
#define evsignal_assign(ev, b, x, cb, arg)         \

   event_assign((ev), (b), (x), EV_SIGNAL|EV_PERSIST, cb, (arg))
~~~

如果需要使用event_assign（），又要保持与将来版本libevent的二进制兼容性，可以请求libevent告知struct event在运行时应该有多大：
~~~c
size_t event_get_struct_event_size(void)

{

    return sizeof(struct event);

}
~~~

这个函数返回需要为event结构体保留的字节数。再次强调，只有在确信堆分配是一个严重的性能问题时才应该使用这个函数，因为这个函数让代码难以阅读和编写。

注意，将来版本的event_get_struct_event_size()的返回值可能比sizeof(struct event)小，这表示event结构体末尾的额外字节仅仅是保留用于将来版本libevent的填充字节。

下面这个例子跟上面的那个相同，但是不依赖于event_struct.h中的event结构体的大小，而是使用event_get_struct_size（）来获取运行时的正确大小。


# Make events unresolved and non-unresolved

## event_add
构造事件之后，在将其添加到event_base之前实际上是不能对其做任何操作的。使用event_add（）将事件添加到event_base。
![](images/Pasted%20image%2020240904153810.png)

在非未决的事件上调用event_add（）将使其在配置的event_base中成为未决的。成功时函数返回0，失败时返回-1。如果tv为NULL，添加的事件不会超时。否则，tv以秒和微秒指定超时值。

如果对已经未决的事件调用event_add（），事件将保持未决状态，并在指定的超时时间被重新调度。

**注意**：不要设置tv为希望超时事件执行的时间。如果在2010年1月1日设置“tv->tv_sec=time(NULL)+10;”，超时事件将会等待40年，而不是10秒。

## event_del()
见上文 Only timeouts events 部分。
对已经初始化的事件调用event_del（）将使其成为非未决和非激活的。如果事件不是未决的或者激活的，调用将没有效果。成功时函数返回0，失败时返回-1。

**注意**：如果在事件激活后，其回调被执行前删除事件，回调将不会执行。

这些函数定义在<event2/event.h>中，从0.1版本就存在了。

# Events with priority

多个事件同时触发时，libevent没有定义各个回调的执行次序。可以使用优先级来定义某些事件比其他事件更重要。

在前一章讨论过，每个event_base有与之相关的一个或者多个优先级。在初始化事件之后，但是在添加到event_base之前，可以为其设置优先级。
## event_priority_set()

~~~c
int event_priority_set(struct event *ev, int pri)

{

    event_debug_assert_is_setup_(ev);
  

    if (ev->ev_flags & EVLIST_ACTIVE)

        return (-1);

    if (pri < 0 || pri >= ev->ev_base->nactivequeues)

        return (-1);

    ev->ev_pri = pri;

    return (0);

}
~~~

事件的优先级是一个在0和event_base的优先级减去1之间的数值。成功时函数返回0，失败时返回-1。

多个不同优先级的事件同时成为激活的时候，低优先级的事件不会运行。libevent会执行高优先级的事件，然后重新检查各个事件。只有在没有高优先级的事件是激活的时候，低优先级的事件才会运行。

~~~c
#include <event2/event.h>

#include <event2/event_struct.h>

void readcb(evutil_socket_t fd, short event, void *arg) ;

void writecb(evutil_socket_t fd, short event, void *arg) ;



void main_loop(evutil_socket_t fd)

{

  

    struct event * important_event ,*unimportant_event;

    struct event_base *base = event_base_new();

    event_base_priority_init(base, 2);

    /* Now base has priority0 and priority 1*/

    important_event = event_new(base, fd, EV_READ|EV_WRITE, readcb, NULL);

    unimportant_event = event_new(base, fd, EV_READ|EV_WRITE, writecb, NULL);

    event_priority_set(important_event, 0);

    event_priority_set(unimportant_event, 1);

    /** Now,whenever the fd is ready for  writing,the write callback will happen

     * before the read callback ,The read callback won't happen at

     * all until the  write callback is no longer active.

       */

  

}
~~~

如果不为事件设置优先级，则默认的优先级将会是event_base的优先级数目除以2。


# Check event status

有时候需要了解事件是否已经添加，检查事件代表什么。
## API
~~~c

#define event_get_signal(ev) ((int)event_get_fd(ev))
int event_pending(const struct event *ev, short event, struct timeval *tv)
short event_get_events(const struct event *ev);
evutil_socket_t event_get_fd(const struct event *ev);
event_callback_fn event_get_callback(const struct event *ev);
void *event_get_callback_arg(const struct event *ev);
void event_get_assignment(const struct event *event, struct event_base **base_out, evutil_socket_t *fd_out, 
                     short *events_out, event_callback_fn *callback_out, void **arg_out)
~~~

event_pending（）函数确定给定的事件是否是未决的或者激活的。如果是，而且what参数设置了<font color="#8064a2">EV_READ</font>、<font color="#8064a2">EV_WRITE</font>、<font color="#8064a2">EV_SIGNAL</font>或者<font color="#8064a2">EV_TIMEOUT</font>等标志，则函数会返回事件当前为之未决或者激活的所有标志。如果提供了<font color="#00b050">tv_out</font>参数，并且what参数中设置了<font color="#8064a2">EV_TIMEOUT</font>标志，而事件当前正因超时事件而未决或者激活，则tv_out会返回事件的超时值。

~~~c
#include <cstddef>

#include <event2/event.h>

#include <stdio.h>

  

int repplace_callback(struct event *ev,event_callback_fn new_callback,

    void *new_callback_arg)  
{

    struct event_base *base;
    evutil_socket_t fd;
    short events;  
    int pengding;

    pengding = event_pending(ev,EV_READ|EV_WRITE|EV_SIGNAL|EV_TIMEOUT,NULL);  
    if(pengding){
        fprintf(stderr,"Error! replace_callback() called on a pending event!\n");
        return -1;
    }
    event_get_assignment(ev,&base,&fd,&events,NULL,NULL);
    event_assign(ev,base,fd,events,new_callback,new_callback_arg);
    return 0;  
}
~~~


event_get_fd（）和event_get_signal（）返回为事件配置的文件描述符或者信号值。event_get_base（）返回为事件配置的event_base。event_get_events（）返回事件的标志（EV_READ、EV_WRITE等）。event_get_callback（）和event_get_callback_arg（）返回事件的回调函数及其参数指针。

event_get_assignment（）复制所有为事件分配的字段到提供的指针中。任何为NULL的参数会被忽略。
## source code
~~~c
void event_get_assignment(const struct event *event, struct event_base **base_out, evutil_socket_t *fd_out, 
                     short *events_out, event_callback_fn *callback_out, void **arg_out)
{

    event_debug_assert_is_setup_(event);  
    if (base_out)
        *base_out = event->ev_base;
    if (fd_out)
        *fd_out = event->ev_fd;
    if (events_out)
        *events_out = event->ev_events;
    if (callback_out)
        *callback_out = event->ev_callback;
    if (arg_out)
        *arg_out = event->ev_arg;
}
~~~


~~~c
  

evutil_socket_t

event_get_fd(const struct event *ev)

{

    event_debug_assert_is_setup_(ev);

    return ev->ev_fd;

}

  

struct event_base *

event_get_base(const struct event *ev)

{

    event_debug_assert_is_setup_(ev);

    return ev->ev_base;

}

  

short

event_get_events(const struct event *ev)

{

    event_debug_assert_is_setup_(ev);

    return ev->ev_events;

}

  

event_callback_fn

event_get_callback(const struct event *ev)

{

    event_debug_assert_is_setup_(ev);

    return ev->ev_callback;

}

  

void *

event_get_callback_arg(const struct event *ev)

{

    event_debug_assert_is_setup_(ev);

    return ev->ev_arg;

}

  

int

event_get_priority(const struct event *ev)

{

    event_debug_assert_is_setup_(ev);

    return ev->ev_pri;

}

~~~
 event_get_fd（）和event_get_signal（）返回为事件配置的文件描述符或者信号值。
 event_get_base（）返回为事件配置的event_base。
 event_get_events（）返回事件的标志（EV_READ、EV_WRITE等）。
 event_get_callback（）和event_get_callback_arg（）返回事件的回调函数及其参数指针。