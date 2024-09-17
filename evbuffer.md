
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

  
/*这个函数返回连续地存储在evbuffer前面的字节数。evbuffer中的数据可能存储在多个分隔开的内存块中，这个函数返回当前第一个块中的字节数。

这个函数在2.0.1-alpha版本引入*/
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
- **`evbuffer_get_length`**:
    
    - 这个函数用于获取 `evbuffer` 中数据的总长度。
    - 函数先锁定 `evbuffer`，以确保在访问 `total_len` 时的线程安全，然后解锁并返回长度。
    - 返回的长度由 `evbuffer` 结构中的 `total_len` 字段提供。
- **`evbuffer_get_contiguous_space`**:
    
    - 这个函数用于获取 `evbuffer` 中可用于写入新数据的连续空间的大小。
    - 函数先锁定 `evbuffer`，然后访问 `first` 链，检查 `off` 字段，该字段可能表示连续空间的偏移量或长度。
    - 解锁 `evbuffer` 后返回这个值。

# Adding data to an evbuffer: the basics
## evbuffer_add
~~~c
int evbuffer_add(struct evbuffer *buf, const void *data_in, size_t datlen);
~~~
这个函数添加data处的datalen字节到buf的末尾，成功时返回0，失败时返回-1。
## evbuffer_add_vprintf  evbuffer_add_printf

~~~c
int evbuffer_add_vprintf(struct evbuffer *buf, const char *fmt, va_list ap);
int evbuffer_add_printf(struct evbuffer *buf, const char *fmt, ...);
~~~

这些函数添加格式化的数据到buf末尾。格式参数和其他参数的处理分别与C库函数printf和vprintf相同。函数返回添加的字节数。
## evbuffer_expand
~~~c
int evbuffer_expand(struct evbuffer *buf, size_t datlen)

{

    struct evbuffer_chain *chain;

    EVBUFFER_LOCK(buf);

    chain = evbuffer_expand_singlechain(buf, datlen);

    EVBUFFER_UNLOCK(buf);

    return chain ? 0 : -1;

}
~~~

这个函数修改缓冲区的最后一块，或者添加一个新的块，使得缓冲区足以容纳datlen字节，而不需要更多的内存分配

## example
~~~c
  

int main() {

    evbuffer * buf = evbuffer_new();

    evbuffer_add(buf,"The time is  24.9.17", sizeof("Hello world 24.9.17"));

    //Via printf

    evbuffer_add_printf(buf, "The time is %s", "24.9.17");

}
~~~

evbuffer_add()和evbuffer_add_printf()函数在libevent 0.8版本引入；evbuffer_expand()首次出现在0.9版本，而evbuffer_add_printf()首次出现在1.1版本。