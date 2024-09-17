
# Creating and releasing evbuffers
## evbuffer_free  evbuffer_new
~~~c
struct evbuffer * evbuffer_new(void)

{

    struct evbuffer *buffer;

    buffer = mm_calloc(1, sizeof(struct evbuffer));

    if (buffer == NULL)

        return (NULL);

    LIST_INIT(&buffer->callbacks);

    buffer->refcnt = 1;

    buffer->last_with_datap = &buffer->first;
  

    return (buffer);

}
~~~

~~~c
void

evbuffer_free(struct evbuffer *buffer)

{

    EVBUFFER_LOCK(buffer);

    evbuffer_decref_and_unlock_(buffer);

}
~~~

这两个函数的功能很简明：evbuffer_new()分配和返回一个新的空evbuffer；而evbuffer_free()释放evbuffer和其内容。

# evbuffer and thread safety
## evbuffer_enable_locking evbuffer_lock evbuffer_unlock
~~~c
int

evbuffer_enable_locking(struct evbuffer *buf, void *lock)

{

#ifdef EVENT__DISABLE_THREAD_SUPPORT

    return -1;

#else

    if (buf->lock)

        return -1;

  

    if (!lock) {

        EVTHREAD_ALLOC_LOCK(lock, EVTHREAD_LOCKTYPE_RECURSIVE);

        if (!lock)

            return -1;

        buf->lock = lock;

        buf->own_lock = 1;

    } else {

        buf->lock = lock;

        buf->own_lock = 0;

    }

  

    return 0;

#endif

}
~~~

~~~c
void

evbuffer_lock(struct evbuffer *buf)

{

    EVBUFFER_LOCK(buf);

}

  

void

evbuffer_unlock(struct evbuffer *buf)

{

    EVBUFFER_UNLOCK(buf);

}
~~~

默认情况下，在多个线程中同时访问evbuffer是不安全的。如果需要这样的访问，可以调用evbuffer_enable_locking()。如果lock参数为NULL，libevent会使用evthread_set_lock_creation_callback提供的锁创建函数创建一个锁。否则，libevent将lock参数用作锁。

evbuffer_lock()和evbuffer_unlock()函数分别请求和释放evbuffer上的锁。可以使用这两个函数让一系列操作是原子的。如果evbuffer没有启用锁，这两个函数不做任何操作。

（注意：对于单个操作，不需要调用evbuffer_lock()和evbuffer_unlock()：如果evbuffer启用了锁，单个操作就已经是原子的。只有在需要多个操作连续执行，不让其他线程介入的时候，才需要手动锁定evbuffer)

这些函数都在2.0.1-alpha版本中引入。

# Check evbuffer

## evbuffer_get_contiguous_space evbuffer_get_length

~~~c
  
//这个函数返回evbuffer存储的字节数，它在2.0.1-alpha版本中引入。
size_t

evbuffer_get_length(const struct evbuffer *buffer)

{

    size_t result;

  

    EVBUFFER_LOCK(buffer);

  

    result = (buffer->total_len);

  

    EVBUFFER_UNLOCK(buffer);

  

    return result;

}

  

size_t

evbuffer_get_contiguous_space(const struct evbuffer *buf)

{

    struct evbuffer_chain *chain;

    size_t result;

  

    EVBUFFER_LOCK(buf);

    chain = buf->first;

    result = (chain != NULL ? chain->off : 0);

    EVBUFFER_UNLOCK(buf);

  

    return result;

}
~~~
