bufferevent可以使用OpenSSL库实现SSL/TLS安全传输层。因为很多应用不需要或者不想链接OpenSSL，这部分功能在单独的libevent_openssl库中实现。未来版本的libevent可能会添加其他SSL/TLS库，如NSS或者GnuTLS，但是当前只有OpenSSL。
OpenSSL功能在2.0.3-alpha版本引入，然而直到2.0.5-beta和2.0.6-rc版本才能良好工作。

这一节不包含对OpenSSL、SSL/TLS或者密码学的概述。
这一节描述的函数都在<font color="#4bacc6">event2/bufferevent_ssl.h</font>中声明。
# Creating and using OpenSSL-based bufferevents
~~~c
 enum bufferevent_ssl_state {

        BUFFEREVENT_SSL_OPEN = 0,

        BUFFEREVENT_SSL_CONNECTING = 1,

        BUFFEREVENT_SSL_ACCEPTING = 2

    };
  
~~~    

~~~c
struct bufferevent *

bufferevent_openssl_filter_new(struct event_base *base,

    struct bufferevent *underlying,

    SSL *ssl,

    enum bufferevent_ssl_state state,

    int options)
~~~

可以创建两种类型的SSL bufferevent：基于过滤器的、在另一个底层bufferevent之上进行通信的buffervent；或者基于套接字的、直接使用OpenSSL进行网络通信的bufferevent。这两种bufferevent都要求提供SSL对象及其状态描述。如果SSL当前作为客户端在进行协商，状态应该是BUFFEREVENT_SSL_CONNECTING；如果作为服务器在进行协商，则是BUFFEREVENT_SSL_ACCEPTING；如果SSL握手已经完成，则状态是BUFFEREVENT_SSL_OPEN。

接受通常的选项。BEV_OPT_CLOSE_ON_FREE表示在关闭openssl bufferevent对象的时候同时关闭SSL对象和底层fd或者bufferevent。

创建基于套接字的bufferevent时，如果SSL对象已经设置了套接字，就不需要提供套接字了：只要传递-1就可以。也可以随后调用bufferevent_setfd（）来设置。

~~~c
SSL * bufferevent_openssl_get_ssl(struct bufferevent *bufev)
~~~
这个函数返回OpenSSL bufferevent使用的SSL对象。如果bev不是一个基于OpenSSL的bufferevent，则返回NULL。
~~~c
unsigned long

	bufferevent_get_openssl_error(struct bufferevent *bev)
~~~
这个函数返回给定bufferevent的第一个未决的OpenSSL错误；如果没有未决的错误，则返回0。错误值的格式与openssl库中的ERR_get_error（）返回的相同。

~~~c
int bufferevent_ssl_renegotiate(struct bufferevent *bev)
~~~

	调用这个函数要求SSL重新协商，bufferevent会调用合适的回调函数。这是个高级功能，通常应该避免使用，除非你确实知道自己在做什么，特别是有些SSL版本具有与重新协商相关的安全问题。
**evbuffer：缓冲IO实用功能**

libevent的evbuffer实现了为向后面添加数据和从前面移除数据而优化的字节队列。

evbuffer用于处理缓冲网络IO的“缓冲”部分。它不提供调度IO或者当IO就绪时触发IO的功能：这是bufferevent的工作。

除非特别说明，本章描述的函数都在event2/buffer.h中声明。1