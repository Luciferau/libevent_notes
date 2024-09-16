每个bufferevent都有一个输入缓冲区和一个输出缓冲区，它们的类型都是“struct evbuffer”。有数据要写入到bufferevent时，添加数据到输出缓冲区；bufferevent中有数据供读取的时候，从输入缓冲区抽取（drain）数据。

evbuffer接口支持很多种操作，后面的章节将讨论这些操作。
# Callbacks and watermarks
每个bufferevent有两个数据相关的回调：一个读取回调和一个写入回调。默认情况下，从底层传输端口读取了任意量的数据之后会调用读取回调；输出缓冲区中足够量的数据被清空到底层传输端口后写入回调会被调用。通过调整bufferevent的读取和写入“水位（watermarks）”可以覆盖这些函数的默认行为。

每个bufferevent有四个watermarks：

-  **读取低水位**：读取操作使得输入缓冲区的数据量在此级别或者更高时，读取回调将被调用。默认值为0，所以每个读取操作都会导致读取回调被调用。

-  **读取高水位**：输入缓冲区中的数据量达到此级别后，bufferevent将停止读取，直到输入缓冲区中足够量的数据被抽取，使得数据量低于此级别。默认值是无限，所以永远不会因为输入缓冲区的大小而停止读取。
- **写入低水位**：写入操作使得输出缓冲区的数据量达到或者低于此级别时，写入回调将被调用。默认值是0，所以只有输出缓冲区空的时候才会调用写入回调。



- **写入高水位**：bufferevent没有直接使用这个水位。它在bufferevent用作另外一个bufferevent的底层传输端口时有特殊意义。请看后面关于过滤型bufferevent的介绍。

bufferevent也有“错误”或者“事件”回调，用于向应用通知非面向数据的事件，如连接已经关闭或者发生错误。定义了下列事件标志：

- **<font color="#8064a2">BEV_EVENT_READING</font>**：读取操作时发生某事件，具体是哪种事件请看其他标志。

- **<font color="#8064a2">BEV_EVENT_WRITING</font>**：写入操作时发生某事件，具体是哪种事件请看其他标志。

- **<font color="#8064a2">BEV_EVENT_ERROR</font>**：操作时发生错误。关于错误的更多信息，请调用EVUTIL_SOCKET_ERROR()。

- **<font color="#8064a2">BEV_EVENT_TIMEOUT</font>**：发生超时。

- **<font color="#8064a2">BEV_EVENT_EOF</font>**：遇到文件结束指示。

- **<font color="#8064a2">BEV_EVENT_CONNECTED</font>**：请求的连接过程已经完成。

上述标志由2.0.2-alpha版新引入。

# Delayed callback

默认情况下，bufferevent 的回调在相应的条件发生时立即被执行。（evbuffer 的回调也是这样的，随后会介绍）在依赖关系复杂的情况下，这种立即调用会制造麻烦。
比如说，假如某个回调在 evbuffer A 空的时候向其中移入数据，而另一个回调在 evbuffer A 满的时候从中取出数据。这些调用都是在栈上发生的，在依赖关系足够复杂的时候，有栈溢出的风险。要解决此问题，可以请求 bufferevent（或者 evbuffer）延迟其回调。条件满足时，延迟回调不会立即调用，而是在 event_loop（）调用中被排队，然后在通常的事件回调之后执行。

（延迟回调由 libevent 2.0.1-alpha 版引入）

# Bufferevent option flags
创建 bufferevent 时可以使用一个或者多个标志修改其行为。可识别的标志有：

- <font color="#8064a2">BEV_OPT_CLOSE_ON_FREE</font>：释放 bufferevent 时关闭底层传输端口。这将关闭底层套接字，释放底层 bufferevent 等。

- <font color="#8064a2">BEV_OPT_THREADSAFE</font>：自动为 bufferevent 分配锁，这样就可以安全地在多个线程中使用bufferevent。

- <font color="#7030a0">BEV_OPT_DEFER_CALLBACKS</font>：设置这个标志时，bufferevent 延迟所有回调，如上所述。

- <font color="#7030a0">BEV_OPT_UNLOCK_CALLBACKS</font>：默认情况下，如果设置 bufferevent 为线程安全的，则bufferevent 会在调用用户提供的回调时进行锁定。设置这个选项会让 libevent 在执行回调的时候不进行锁定。

（<font color="#7030a0">BEV_OPT_UNLOCK_CALLBACKS</font> 由 2.0.5-beta 版引入，其他选项由 2.0.1-alpha 版引入）

# Working with socket-based bufferevents
基于套接字的 bufferevent 是最简单的，它使用 libevent 的底层事件机制来检测底层网络套接字是否已经就绪，可以进行读写操作，并且使用底层网络调用（如 readv、writev、WSASend、WSARecv）来发送和接收数据。

## Creating a socket-based bufferevent

可以使用 bufferevent_socket_new()创建基于套接字的 bufferevent

~~~c  
struct bufferevent * bufferevent_socket_new(struct event_base *base, evutil_socket_t fd,int options)
~~~

### source code
~~~c  
struct bufferevent *

bufferevent_socket_new(struct event_base *base, evutil_socket_t fd,

    int options)

{

    struct bufferevent_private *bufev_p;

    struct bufferevent *bufev;

  

#ifdef _WIN32

    if (base && event_base_get_iocp_(base))

        return bufferevent_async_new_(base, fd, options);

#endif

  

    if ((bufev_p = mm_calloc(1, sizeof(struct bufferevent_private)))== NULL)

        return NULL;

  

    if (bufferevent_init_common_(bufev_p, base, &bufferevent_ops_socket,

                    options) < 0) {

        mm_free(bufev_p);

        return NULL;

    }

    bufev = &bufev_p->bev;

    evbuffer_set_flags(bufev->output, EVBUFFER_FLAG_DRAINS_TO_FD);

  

    event_assign(&bufev->ev_read, bufev->ev_base, fd,

        EV_READ|EV_PERSIST|EV_FINALIZE, bufferevent_readcb, bufev);

    event_assign(&bufev->ev_write, bufev->ev_base, fd,

        EV_WRITE|EV_PERSIST|EV_FINALIZE, bufferevent_writecb, bufev);

  

    evbuffer_add_cb(bufev->output, bufferevent_socket_outbuf_cb, bufev);

  

    evbuffer_freeze(bufev->input, 0);

    evbuffer_freeze(bufev->output, 1);

  

    return bufev;

}
~~~

base 是 event_base，options 是表示 bufferevent 选项（BEV_OPT_CLOSE_ON_FREE 等）的位掩码，fd 是一个可选的表示套接字的文件描述符。如果想以后设置文件描述符，可以设置 fd 为-1。成功时函数返回一个 bufferevent，失败则返回 NULL。

bufferevent_socket_new()函数由 2.0.1-alpha 版新引入

## Start a connection on a socket-based bufferevent
如果 bufferevent 的套接字还没有连接上，可以启动新的连接
~~~c
int bufferevent_socket_connect(struct bufferevent *bev,const struct sockaddr *sa, int socklen);
~~~

address 和 addrlen 参数跟标准调用 connect()的参数相同。如果还没有为 bufferevent设置套接字，调用函数将为其分配一个新的流套接字，并且设置为非阻塞的。
标准调用
~~~c
extern int connect (int __fd, __CONST_SOCKADDR_ARG __addr, socklen_t __len);
~~~

如果已经为 bufferevent 设置套接字，调用 bufferevent_socket_connect()将告知libevent 套接字还未连接，直到连接成功之前不应该对其进行读取或者写入操作。连接完成之前可以向输出缓冲区添加数据。

如果连接成功启动，函数返回 0；如果发生错误则返回-1。

### source code
#### bufferevent_socket_connect()
~~~c    
int bufferevent_socket_connect(struct bufferevent *bev,

    const struct sockaddr *sa, int socklen)

{

    struct bufferevent_private *bufev_p = BEV_UPCAST(bev);

  

    evutil_socket_t fd;

    int r = 0;

    int result=-1;

    int ownfd = 0;

  

    bufferevent_incref_and_lock_(bev);

  

    fd = bufferevent_getfd(bev);

    if (fd < 0) {

        if (!sa)

            goto done;

        fd = evutil_socket_(sa->sa_family,

            SOCK_STREAM|EVUTIL_SOCK_NONBLOCK, 0);

        if (fd < 0)

            goto freesock;

        ownfd = 1;

    }

    if (sa) {

#ifdef _WIN32

        if (bufferevent_async_can_connect_(bev)) {

            bufferevent_setfd(bev, fd);

            r = bufferevent_async_connect_(bev, fd, sa, socklen);

            if (r < 0)

                goto freesock;

            bufev_p->connecting = 1;

            result = 0;

            goto done;

        } else

#endif

        r = evutil_socket_connect_(&fd, sa, socklen);

        if (r < 0)

            goto freesock;

    }

#ifdef _WIN32

    /* ConnectEx() isn't always around, even when IOCP is enabled.

     * Here, we borrow the socket object's write handler to fall back

     * on a non-blocking connect() when ConnectEx() is unavailable. */

    if (BEV_IS_ASYNC(bev)) {

        event_assign(&bev->ev_write, bev->ev_base, fd,

            EV_WRITE|EV_PERSIST|EV_FINALIZE, bufferevent_writecb, bev);

    }

#endif

    bufferevent_setfd(bev, fd);

    if (r == 0) {

        if (! be_socket_enable(bev, EV_WRITE)) {

            bufev_p->connecting = 1;

            result = 0;

            goto done;

        }

    } else if (r == 1) {

        /* The connect succeeded already. How very BSD of it. */

        result = 0;

        bufev_p->connecting = 1;

        bufferevent_trigger_nolock_(bev, EV_WRITE, BEV_OPT_DEFER_CALLBACKS);

    } else {

        /* The connect failed already.  How very BSD of it. */

        result = 0;

        bufferevent_run_eventcb_(bev, BEV_EVENT_ERROR, BEV_OPT_DEFER_CALLBACKS);

        bufferevent_disable(bev, EV_WRITE|EV_READ);

    }

  

    goto done;

  

freesock:

    if (ownfd)

        evutil_closesocket(fd);

done:

    bufferevent_decref_and_unlock_(bev);

    return result;

}

~~~
### example
~~~c
#include <event2/event.h>

#include <event2/event_struct.h>

#include <event2/bufferevent.h>

#include <sys/socket.h>

#include <arpa/inet.h>

#include <string.h>

  

void event_cb(struct bufferevent *bev,short events,void *ptr)

{

    if(events & BEV_EVENT_CONNECTED){

        /** We're connected to 127.0.0.1:8080.  

         * Ordinarily we'd do somethings here,like start reading or writing */

    }

    else if (events & BEV_EVENT_ERROR) {

        /** An error occured while connecting. */

    }

}

  

int main_loop(void)

{

    struct event_base *base = event_base_new();

    struct bufferevent *bev = bufferevent_socket_new(base,-1,BEV_OPT_CLOSE_ON_FREE);

    struct sockaddr_in sin ;

    memset(&sin,0,sizeof(sin));

    sin.sin_addr.s_addr = htonl(0x0100007F);//INADDR_LOOPBACK

    sin.sin_port = htons(8080);

    bufferevent_setcb(bev,NULL,NULL,event_cb,NULL);



    if(bufferevent_socket_connect(bev,(struct sockaddr *)&sin,sizeof(sin)) < 0){

        /**Error starting connection */

        bufferevent_free(bev);

        return -1;

    }

    event_base_dispatch(base);

    event_base_free(base);

    return 0;
~~~
bufferevent_socket_connect()函数由2.0.2-alpha版引入。在此之前，必须自己手动在套接字上调用connect()，连接完成时，bufferevent将报告写入事件。

**注意：如果使用bufferevent_socket_connect()发起连接，将只会收到BEV_EVENT_CONNECTED事件。如果自己调用connect()，则连接上将被报告为写入事件。**

这个函数在2.0.2-alpha版引入。

## Initiate connection by hostname
常常需要将解析主机名和连接到主机合并成单个操作，libevent为此提供了：
### bufferevent_socket_connect_hostname()
~~~c
int bufferevent_socket_connect_hostname(struct bufferevent *bev,
    struct evdns_base *evdns_base, int family, const char *hostname, int port);
int bufferevent_socket_get_dns_error(struct bufferevent *bev);    
~~~

这个函数解析名字hostname，查找其family类型的地址（允许的地址族类型有AF_INET,AF_INET6和AF_UNSPEC）。如果名字解析失败，函数将调用事件回调，报告错误事件。如果解析成功，函数将启动连接请求，就像bufferevent_socket_connect()一样。

dns_base参数是可选的：如果为NULL，等待名字查找完成期间调用线程将被阻塞，而这通常不是期望的行为；如果提供dns_base参数，libevent将使用它来异步地查询主机名。关于DNS的更多信息，请看第九章。

跟bufferevent_socket_connect()一样，函数告知libevent，bufferevent上现存的套接字还没有连接，在名字解析和连接操作成功完成之前，不应该对套接字进行读取或者写入操作。

函数返回的错误可能是DNS主机名查询错误，可以调用<font color="#8064a2">bufferevent_socket_get_dns_error()</font>来获取最近的错误。返回值0表示没有检测到DNS错误。

### Simple HTTP v0 client

~~~c
#include <event2/dns.h>

#include <event2/bufferevent.h>

#include <event2/buffer.h>

#include <event2/util.h>

#include <event2/event.h>

  

#include <stdio.h>

  

void readcb(struct bufferevent *bev, void *ctx) {

  

    char buf[1024];

    int n;

    struct evbuffer * input = bufferevent_get_input(bev);

    while((n = evbuffer_remove(input, buf, sizeof(buf))) > 0) {

        fwrite(buf, 1, n, stdout); //printf("%s", buf);

    }

}

  

void eventcb(struct bufferevent *bev, short events, void *ctx) {

    if (events & BEV_EVENT_CONNECTED){

        printf("connect success\n");

    }else if(events & (BEV_EVENT_ERROR | BEV_EVENT_EOF)){

        struct event_base *base = (event_base*)ctx;

        if(events& BEV_EVENT_ERROR){

            int err = bufferevent_socket_get_dns_error(bev);

            if(err){

                printf("DNS error %d\n", err);

            }

        }

  

        printf("Closing connection\n");

        bufferevent_free(bev);

        event_base_loopexit(base, NULL);

  

    }

}

  
  

int main(int argc, char **argv) {

  

    struct event_base   *base;

    struct evdns_base   *dns_base;

    struct bufferevent  *bev;

  

    if(argc != 3){

       printf("Trival HTTP 0.x client\n"

                "Syntax: %s [hostname] [resource]\n"

                "Example: %s www.google.com /\n", argv[0], argv[0]);

        return 1;

    }

  

    base = event_base_new();

    dns_base = evdns_base_new(base, 1);

  

    bev = bufferevent_socket_new(base, -1, BEV_OPT_CLOSE_ON_FREE);

    bufferevent_setcb(bev, readcb, NULL, eventcb, base);

    bufferevent_enable(bev,EV_READ|EV_WRITE);

  

    evbuffer_add_printf(bufferevent_get_output(bev), "GET %s HTTP/1.0\r\nHost: %s\r\n\r\n", argv[2], argv[1]);

    bufferevent_socket_connect_hostname(bev, dns_base, AF_UNSPEC, argv[1], 80);

    event_base_dispatch(base);

    return 0;

  

}
~~~

### source code
~~~c  
int bufferevent_socket_connect_hostname(struct bufferevent *bev,
    struct evdns_base *evdns_base, int family, const char *hostname, int port)
{
    char portbuf[10];
    struct evutil_addrinfo hint;
    struct bufferevent_private *bev_p = BEV_UPCAST(bev);  
    if (family != AF_INET && family != AF_INET6 && family != AF_UNSPEC)
        return -1;
    if (port < 1 || port > 65535)
        return -1;  

    memset(&hint, 0, sizeof(hint));
    hint.ai_family = family;
    hint.ai_protocol = IPPROTO_TCP;
    hint.ai_socktype = SOCK_STREAM;
  
    evutil_snprintf(portbuf, sizeof(portbuf), "%d", port);  
    BEV_LOCK(bev);
    bev_p->dns_error = 0;  
    bufferevent_suspend_write_(bev, BEV_SUSPEND_LOOKUP)
    bufferevent_suspend_read_(bev, BEV_SUSPEND_LOOKUP);  
    bufferevent_incref_(bev);
    bev_p->dns_request = evutil_getaddrinfo_async_(evdns_base, hostname,
        portbuf, &hint, bufferevent_connect_getaddrinfo_cb, bev);

    BEV_UNLOCK(bev);
  
    return 0;

}
~~~

~~~c   
int bufferevent_socket_get_dns_error(struct bufferevent *bev)
{
    int rv;
    struct bufferevent_private *bev_p = BEV_UPCAST(bev);  
    BEV_LOCK(bev);
    rv = bev_p->dns_error;
    BEV_UNLOCK(bev);
    return rv;

}
~~~

# Common bufferevent operations
本节描述的函数可用于多种bufferevent实现。

## free bufferevent
### bufferevent_free
~~~c
void bufferevent_free(struct bufferevent *bufev){
{

    BEV_LOCK(bufev);

    bufferevent_setcb(bufev, NULL, NULL, NULL, NULL);

    bufferevent_cancel_all_(bufev);//

    bufferevent_decref_and_unlock_(bufev);//

}}
~~~

这个函数释放bufferevent。bufferevent内部具有引用计数，所以，如果释放bufferevent时还有未决的延迟回调，则在回调完成之前bufferevent不会被删除。

如果设置了BEV_OPT_CLOSE_ON_FREE标志，并且bufferevent有一个套接字或者底层bufferevent作为其传输端口，则释放bufferevent将关闭这个传输端口。
## Operation callbacks, watermarks, and enable/disable
### bufferevent_data_cb bufferevent_data_cb bufferevent_event_cb
~~~c
void bufferevent_setcb(struct bufferevent *bufev,
	    bufferevent_data_cb readcb, bufferevent_data_cb writecb,bufferevent_event_cb eventcb, void *cbarg);
~~~
---


~~~c  
/**
   A read or write callback for a bufferevent.  
   The read callback is triggered when new data arrives in the input
   buffer and the amount of readable data exceed the low watermark
   which is 0 by default.  
   The write callback is triggered if the write buffer has been
   exhausted or fell below its low watermark.  
   @param bev the bufferevent that triggered the callback
   @param ctx the user-specified context for this buffervent
 */

typedef void (*bufferevent_data_cb)(struct bufferevent *bev, void *ctx);    
~~~


~~~c
  

/**

   An event/error callback for a bufferevent.  
   The event callback is triggered if either an EOF condition or another
   unrecoverable error was encountered.
     For bufferevents with deferred callbacks, this is a bitwise OR of all errors

   that have happened on the bufferevent since the last callback invocation.

   @param bev the bufferevent for which the error condition was reached

   @param what a conjunction of flags: BEV_EVENT_READING or BEV_EVENT_WRITING

     to indicate if the error was encountered on the read or write path,

     and one of the following flags: BEV_EVENT_EOF, BEV_EVENT_ERROR,
	    BEV_EVENT_TIMEOUT, BEV_EVENT_CONNECTED.
  

   @param ctx the user-specified context for this bufferevent

*/

typedef void (*bufferevent_event_cb)(struct bufferevent *bev, short what, void *ctx);
~~~
#### source code
~~~c
void

bufferevent_setcb(struct bufferevent *bufev,

    bufferevent_data_cb readcb, bufferevent_data_cb writecb,

    bufferevent_event_cb eventcb, void *cbarg)

{

    BEV_LOCK(bufev);

  

    bufev->readcb = readcb;

    bufev->writecb = writecb;

    bufev->errorcb = eventcb;

  

    bufev->cbarg = cbarg;

    BEV_UNLOCK(bufev);

}
~~~

bufferevent_setcb()函数修改bufferevent的一个或者多个回调。readcb、writecb和eventcb函数将分别在已经读取足够的数据、已经写入足够的数据，或者发生错误时被调用。每个回调函数的第一个参数都是发生了事件的bufferevent，最后一个参数都是调用bufferevent_setcb()时用户提供的cbarg参数：可以通过它向回调传递数据。事件回调的events参数是一个表示事件标志的位掩码：请看前面的“Callbacks and watermarks”节。

要禁用回调，传递NULL而不是回调函数。<font color="#c0504d">注意：bufferevent的所有回调函数共享单个cbarg，所以修改它将影响所有回调函数。</font>
这个函数由1.4.4版引入。类型名bufferevent_data_cb和bufferevent_event_cb由2.0.2-alpha版引入。

---
### bufferevent_enable bufferevent_disable bufferevent_get_enabled
~~~c
int bufferevent_enable(struct bufferevent *bufev, short event);  
int bufferevent_disable(struct bufferevent *bufev, short event);  
short bufferevent_get_enabled(struct bufferevent *bufev);
~~~
可以启用或者禁用bufferevent上的<font color="#8064a2">EV_READ</font>、<font color="#8064a2">EV_WRITE</font>或者<font color="#8064a2">EV_READ | EV_WRITE</font>事件。没有启用读取或者写入事件时，bufferevent将不会试图进行数据读取或者写入。

没有必要在输出缓冲区空时禁用写入事件：bufferevent将自动停止写入，然后在有数据等待写入时重新开始。
类似地，没有必要在输入缓冲区高于高水位时禁用读取事件：bufferevent将自动停止读取，然后在有空间用于读取时重新开始读取。

默认情况下，新创建的bufferevent的写入是启用的，但是读取没有启用。

可以调用bufferevent_get_enabled()确定bufferevent上当前启用的事件。

除了bufferevent_get_enabled()由2.0.3-alpha版引入外，这些函数都由0.8版引入。

#### source code
~~~c
short

bufferevent_get_enabled(struct bufferevent *bufev)

{

    short r;

    BEV_LOCK(bufev);

    r = bufev->enabled;

    BEV_UNLOCK(bufev);

    return r;

}
~~~

~~~c
  

int

bufferevent_enable(struct bufferevent *bufev, short event)

{

    struct bufferevent_private *bufev_private = BEV_UPCAST(bufev);

    short impl_events = event;

    int r = 0;

  

    bufferevent_incref_and_lock_(bufev);

    if (bufev_private->read_suspended)

        impl_events &= ~EV_READ;

    if (bufev_private->write_suspended)

        impl_events &= ~EV_WRITE;

  

    bufev->enabled |= event;

  

    if (impl_events && bufev->be_ops->enable(bufev, impl_events) < 0)

        r = -1;

    if (r)

        event_debug(("%s: cannot enable 0x%hx on %p", __func__, event, bufev));

  

    bufferevent_decref_and_unlock_(bufev);

    return r;

}
~~~

~~~c
int

bufferevent_disable(struct bufferevent *bufev, short event)

{

    int r = 0;

  

    BEV_LOCK(bufev);

    bufev->enabled &= ~event;

  

    if (bufev->be_ops->disable(bufev, event) < 0)

        r = -1;

    if (r)

        event_debug(("%s: cannot disable 0x%hx on %p", __func__, event, bufev));

  

    BEV_UNLOCK(bufev);

    return r;

}
~~~

## bufferevent_setwatermark
~~~c  
void bufferevent_setwatermark(struct bufferevent *bufev, short events,size_t lowmark, size_t highmark);   
~~~

bufferevent_setwatermark()函数调整单个bufferevent的读取水位、写入水位，或者同时调整二者。（如果events参数设置了EV_READ，调整读取水位。如果events设置了<font color="#8064a2">EV_WRITE</font>标志，调整写入水位）

对于高水位，0表示“无限”。
### source code

~~~c
  
/*

 * Sets the water marks

 */
void bufferevent_setwatermark(struct bufferevent *bufev, short events,

    size_t lowmark, size_t highmark)

{

    struct bufferevent_private *bufev_private = BEV_UPCAST(bufev);

  

    BEV_LOCK(bufev);

    if (events & EV_WRITE) {

        bufev->wm_write.low = lowmark;

        bufev->wm_write.high = highmark;

    }

  

    if (events & EV_READ) {

        bufev->wm_read.low = lowmark;

        bufev->wm_read.high = highmark;

  

        if (highmark) {

            /* There is now a new high-water mark for read.

               enable the callback if needed, and see if we should

               suspend/bufferevent_wm_unsuspend. */

  

            if (bufev_private->read_watermarks_cb == NULL) {

                bufev_private->read_watermarks_cb =

                    evbuffer_add_cb(bufev->input,

                            bufferevent_inbuf_wm_cb,

                            bufev);

            }

            evbuffer_cb_set_flags(bufev->input,

                      bufev_private->read_watermarks_cb,

                      EVBUFFER_CB_ENABLED|EVBUFFER_CB_NODEFER);

  

            if (evbuffer_get_length(bufev->input) >= highmark)

                bufferevent_wm_suspend_read(bufev);

            else if (evbuffer_get_length(bufev->input) < highmark)

                bufferevent_wm_unsuspend_read(bufev);

        } else {

            /* There is now no high-water mark for read. */

            if (bufev_private->read_watermarks_cb)

                evbuffer_cb_clear_flags(bufev->input,

                    bufev_private->read_watermarks_cb,

                    EVBUFFER_CB_ENABLED);

            bufferevent_wm_unsuspend_read(bufev);

        }

    }

    BEV_UNLOCK(bufev);

}
~~~

#### example
~~~c
#include <cstddef>

#include <cstdlib>

#include <event2/bufferevent.h>

#include <event2/event.h>

#include <event2/buffer.h>

#include <event2/event_struct.h>

#include <event2/listener.h>

#include <event2/util.h>

  

#include <stdio.h>

#include <errno.h>

#include <string.h>

  

typedef struct info_{

    const char * name;

    size_t total_drained;

}info;

  

void read_callback(struct bufferevent *bev, void *ctx){

    struct info_ * inf = static_cast<info_*>(ctx);

    struct evbuffer *input = bufferevent_get_input(bev);

    size_t len = evbuffer_get_length(input);

    if(!len){

        inf->total_drained += len;

        evbuffer_drain(input, len);

        printf("drained %lu bytes from %s \n",(unsigned long )len,inf->name);

  

    }

}

  

void event_callback(struct bufferevent *bev, short events, void *ctx){

    struct info_ * inf = static_cast<info_*>(ctx);

    struct evbuffer *input = bufferevent_get_input(bev);

    size_t len = evbuffer_get_length(input);

    int finished = 0;

    if(events & BEV_EVENT_EOF){

        size_t len = evbuffer_get_length(input);

        printf("Got a close from %s, drained %lu bytes from it\n",

        inf->name, (unsigned long)len);

        finished = 1;

    }

    if(events & BEV_EVENT_ERROR){

        size_t len = evbuffer_get_length(input);

        printf("Got an error from %s : %s\n",inf->name,EVUTIL_SOCKET_ERROR());

        finished =1  ;

    }

  

    if(finished){

        free(ctx);

        bufferevent_free(bev);

    }

  

}

  

struct bufferevent * setup_bufferevent(void){

    struct bufferevent *bev =  nullptr;

    struct info_ * infol;

  

    infol = (info_*)malloc(sizeof(info_));

    infol->name = "buffer one";

    infol->total_drained = 0;

  

    /** Here we should get set up the bufferevent and make sure it gets connected.. */

  

    /**Trigger the read callback  only whenever there is at least 128 bytes

     * of data in the buffer

     */

  

    bufferevent_setwatermark(bev, EV_READ, 128, 0);

    bufferevent_setcb(bev, read_callback, nullptr, event_callback, infol);

  

    bufferevent_enable(bev, EV_READ);

    return bev;

}
~~~

## Operate the data in buffevent
如果只是通过网络读取或者写入数据，而不能观察操作过程，是没什么好处的。bufferevent提供了下列函数用于观察要写入或者读取的数据。
(Reading and writing data from the network does you no good if you can't look at it.Bufferevents give you these methods to give them data to write,and to get the data to read.)
### bufferevent_get_input bufferevent_get_output

~~~c
struct evbuffer * bufferevent_get_input(struct bufferevent *bufev);
struct evbuffer * bufferevent_get_output(struct bufferevent *bufev);
~~~

~~~c
  

struct evbuffer *

bufferevent_get_input(struct bufferevent *bufev)

{

    return bufev->input;

}

  

struct evbuffer *

bufferevent_get_output(struct bufferevent *bufev)

{

    return bufev->output;

}
~~~
这两个函数提供了非常强大的基础：它们分别返回输入和输出缓冲区。关于可以对evbuffer类型进行的所有操作的完整信息，请看下一章。

<font color="#c0504d">如果写入操作因为数据量太少而停止（或者读取操作因为太多数据而停止），则向输出缓冲区添加数据（或者从输入缓冲区移除数据）将自动重启操作。</font>

这些函数由2.0.1-alpha版引入。

### <font color="#4bacc6">bufferevent_write</font>  <font color="#4bacc6">bufferevent_write_buffer</font>

~~~c
int

bufferevent_write(struct bufferevent *bufev, const void *data, size_t size)
{
    if (evbuffer_add(bufev->output, data, size) == -1)
        return (-1);
    return 0;
}


int

bufferevent_write_buffer(struct bufferevent *bufev, struct evbuffer *buf)
{
    if (evbuffer_add_buffer(bufev->output, buf) == -1)
        return (-1);
    return 0;
}
~~~

这些函数向<font color="#8064a2">bufferevent</font>的输出缓冲区添加数据。<font color="#4bacc6">bufferevent_write</font>()将内存中从data处开始的size字节数据添加到输出缓冲区的末尾。bufferevent_write_buffer()移除buf的所有内容，将其放置到输出缓冲区的末尾。成功时这些函数都返回0，发生错误时则返回-1。

这些函数从0.8版就存在了。

### <font color="#4bacc6">bufferevent_read</font> <font color="#4bacc6">bufferevent_read_buffer</font> 

~~~c
size_t

bufferevent_read(struct bufferevent *bufev, void *data, size_t size)

{

    return (evbuffer_remove(bufev->input, data, size));

}

  

int

bufferevent_read_buffer(struct bufferevent *bufev, struct evbuffer *buf)

{

    return (evbuffer_add_buffer(buf, bufev->input));

}

~~~

这些函数从bufferevent的输入缓冲区移除数据。bufferevent_read()至多从输入缓冲区移除size字节的数据，将其存储到内存中data处。函数返回实际移除的字节数。bufferevent_read_buffer()函数抽空输入缓冲区的所有内容，将其放置到buf中，成功时返回0，失败时返回-1。

注意，对于bufferevent_read()，data处的内存块必须有足够的空间容纳size字节数据。

<font color="#4bacc6">bufferevent_read</font>()函数从0.8版就存在了；bufferevnet_read_buffer()由2.0.1-alpha版引入。

### <font color="#4bacc6">evbuffer_add_buffer</font>
~~~c
  

int

evbuffer_add_buffer(struct evbuffer *outbuf, struct evbuffer *inbuf)

{

    struct evbuffer_chain *pinned, *last;

    size_t in_total_len, out_total_len;

    int result = 0;

  

    EVBUFFER_LOCK2(inbuf, outbuf);

    in_total_len = inbuf->total_len;

    out_total_len = outbuf->total_len;

  

    if (in_total_len == 0 || outbuf == inbuf)

        goto done;

  

    if (outbuf->freeze_end || inbuf->freeze_start) {

        result = -1;

        goto done;

    }

  

    if (PRESERVE_PINNED(inbuf, &pinned, &last) < 0) {

        result = -1;

        goto done;

    }

  

    if (out_total_len == 0) {

        /* There might be an empty chain at the start of outbuf; free

         * it. */

        evbuffer_free_all_chains(outbuf->first);

        COPY_CHAIN(outbuf, inbuf);

    } else {

        APPEND_CHAIN(outbuf, inbuf);

    }

  

    RESTORE_PINNED(inbuf, pinned, last);

  

    inbuf->n_del_for_cb += in_total_len;

    outbuf->n_add_for_cb += in_total_len;

  

    evbuffer_invoke_callbacks_(inbuf);

    evbuffer_invoke_callbacks_(outbuf);

  

done:

    EVBUFFER_UNLOCK2(inbuf, outbuf);

    return result;

}
~~~