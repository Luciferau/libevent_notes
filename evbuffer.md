
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
