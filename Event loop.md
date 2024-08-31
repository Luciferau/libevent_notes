# run loop
一旦有了一个已经注册了某些事件的event_base，就需要让libevent等待事件并且通知事件的发生。
## API
```c
int event_base_loop(struct event_base *, int);
```

### source code
```c

int

event_base_loop(struct event_base *base, int flags)

{

    const struct eventop *evsel = base->evsel;

    struct timeval tv;

    struct timeval *tv_p;

    int res, done, retval = 0;

  

    /* Grab the lock.  We will release it inside evsel.dispatch, and again

     * as we invoke user callbacks. */

    EVBASE_ACQUIRE_LOCK(base, th_base_lock);

  

    if (base->running_loop) {

        event_warnx("%s: reentrant invocation.  Only one event_base_loop"

            " can run on each event_base at once.", __func__);

        EVBASE_RELEASE_LOCK(base, th_base_lock);

        return -1;

    }

  

    base->running_loop = 1;

  

    clear_time_cache(base);

  

    if (base->sig.ev_signal_added && base->sig.ev_n_signals_added)

        evsig_set_base_(base);

  

    done = 0;

  

#ifndef EVENT__DISABLE_THREAD_SUPPORT

    base->th_owner_id = EVTHREAD_GET_ID();

#endif

  

    base->event_gotterm = base->event_break = 0;

  

    while (!done) {

        base->event_continue = 0;

        base->n_deferreds_queued = 0;

  

        /* Terminate the loop if we have been asked to */

        if (base->event_gotterm) {

            break;

        }

  

        if (base->event_break) {

            break;

        }

  

        tv_p = &tv;

        if (!N_ACTIVE_CALLBACKS(base) && !(flags & EVLOOP_NONBLOCK)) {

            timeout_next(base, &tv_p);

        } else {

            /*

             * if we have active events, we just poll new events

             * without waiting.

             */

            evutil_timerclear(&tv);

        }

  

        /* If we have no events, we just exit */

        if (0==(flags&EVLOOP_NO_EXIT_ON_EMPTY) &&

            !event_haveevents(base) && !N_ACTIVE_CALLBACKS(base)) {

            event_debug(("%s: no events registered.", __func__));

            retval = 1;

            goto done;

        }

  

        event_queue_make_later_events_active(base);

  

        clear_time_cache(base);

  

        res = evsel->dispatch(base, tv_p);

  

        if (res == -1) {

            event_debug(("%s: dispatch returned unsuccessfully.",

                __func__));

            retval = -1;

            goto done;

        }

  

        update_time_cache(base);

  

        timeout_process(base);

  

        if (N_ACTIVE_CALLBACKS(base)) {

            int n = event_process_active(base);

            if ((flags & EVLOOP_ONCE)

                && N_ACTIVE_CALLBACKS(base) == 0

                && n != 0)

                done = 1;

        } else if (flags & EVLOOP_NONBLOCK)

            done = 1;

    }

    event_debug(("%s: asked to terminate loop.", __func__));

  

done:

    clear_time_cache(base);

    base->running_loop = 0;

  

    EVBASE_RELEASE_LOCK(base, th_base_lock);

  

    return (retval);

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
## API

```c
int

event_base_dispatch(struct event_base *event_base)

{

    return (event_base_loop(event_base, 0));

}
```
