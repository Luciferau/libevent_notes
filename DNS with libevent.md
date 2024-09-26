# DNS with libevent: high-level and low-level functionality

libevent提供了少量用于解析DNS名字的API，以及用于实现简单DNS服务器的机制。
我们从用于名字查询的高层机制开始介绍，然后介绍底层机制和服务器机制。

# Portable blocking name resolution
为移植已经使用阻塞式名字解析的程序，libevent提供了标准getaddrinfo()接口的可移植实现。对于需要运行在没有getaddrinfo(）函数，或者getaddrinfo()不像我们的替代函数那样遵循标准的平台上的程序，这个替代实现很有用。

getaddrinfo()接口由RFC 中定义。关于libevent如何不满足其一致性实现的概述，请看下面的“兼容性提示”节。

~~~c
/* Extension from POSIX.1:2001.  */
#ifdef __USE_XOPEN2K
#define evutil_addrinfo addrinfo
/* Structure to contain information about address of a service provider.  */
struct addrinfo
{
  int ai_flags;			/* Input flags.  */
  int ai_family;		/* Protocol family for socket.  */
  int ai_socktype;		/* Socket type.  */
  int ai_protocol;		/* Protocol for socket.  */
  socklen_t ai_addrlen;		/* Length of socket address.  */
  struct sockaddr *ai_addr;	/* Socket address for socket.  */
  char *ai_canonname;		/* Canonical name for service location.  */
  struct addrinfo *ai_next;	/* Pointer to next in list.  */
};
~~~

~~~C
/** @name evutil_getaddrinfo() error codes

    These values are possible error codes for evutil_getaddrinfo() and
    related functions.

    @{
*/
#if defined(EAI_ADDRFAMILY) && defined(EVENT__HAVE_GETADDRINFO)
#define EVUTIL_EAI_ADDRFAMILY EAI_ADDRFAMILY
#else
#define EVUTIL_EAI_ADDRFAMILY -901
#endif
#if defined(EAI_AGAIN) && defined(EVENT__HAVE_GETADDRINFO)
#define EVUTIL_EAI_AGAIN EAI_AGAIN
#else
#define EVUTIL_EAI_AGAIN -902
#endif
#if defined(EAI_BADFLAGS) && defined(EVENT__HAVE_GETADDRINFO)
#define EVUTIL_EAI_BADFLAGS EAI_BADFLAGS
#else
#define EVUTIL_EAI_BADFLAGS -903
#endif
#if defined(EAI_FAIL) && defined(EVENT__HAVE_GETADDRINFO)
#define EVUTIL_EAI_FAIL EAI_FAIL
#else
#define EVUTIL_EAI_FAIL -904
#endif
#if defined(EAI_FAMILY) && defined(EVENT__HAVE_GETADDRINFO)
#define EVUTIL_EAI_FAMILY EAI_FAMILY
#else
#define EVUTIL_EAI_FAMILY -905
#endif
#if defined(EAI_MEMORY) && defined(EVENT__HAVE_GETADDRINFO)
#define EVUTIL_EAI_MEMORY EAI_MEMORY
#else
#define EVUTIL_EAI_MEMORY -906
#endif
/* This test is a bit complicated, since some MS SDKs decide to
 * remove NODATA or redefine it to be the same as NONAME, in a
 * fun interpretation of RFC 2553 and RFC 3493. */
#if defined(EAI_NODATA) && defined(EVENT__HAVE_GETADDRINFO) && (!defined(EAI_NONAME) || EAI_NODATA != EAI_NONAME)
#define EVUTIL_EAI_NODATA EAI_NODATA
#else
#define EVUTIL_EAI_NODATA -907
#endif
#if defined(EAI_NONAME) && defined(EVENT__HAVE_GETADDRINFO)
#define EVUTIL_EAI_NONAME EAI_NONAME
#else
#define EVUTIL_EAI_NONAME -908
#endif
#if defined(EAI_SERVICE) && defined(EVENT__HAVE_GETADDRINFO)
#define EVUTIL_EAI_SERVICE EAI_SERVICE
#else
#define EVUTIL_EAI_SERVICE -909
#endif
#if defined(EAI_SOCKTYPE) && defined(EVENT__HAVE_GETADDRINFO)
#define EVUTIL_EAI_SOCKTYPE EAI_SOCKTYPE
#else
#define EVUTIL_EAI_SOCKTYPE -910
#endif
#if defined(EAI_SYSTEM) && defined(EVENT__HAVE_GETADDRINFO)
#define EVUTIL_EAI_SYSTEM EAI_SYSTEM
#else
#define EVUTIL_EAI_SYSTEM -911
#endif

#define EVUTIL_EAI_CANCEL -90001

#if defined(AI_PASSIVE) && defined(EVENT__HAVE_GETADDRINFO)
#define EVUTIL_AI_PASSIVE AI_PASSIVE
#else
#define EVUTIL_AI_PASSIVE 0x1000
#endif
#if defined(AI_CANONNAME) && defined(EVENT__HAVE_GETADDRINFO)
#define EVUTIL_AI_CANONNAME AI_CANONNAME
#else
#define EVUTIL_AI_CANONNAME 0x2000
#endif
#if defined(AI_NUMERICHOST) && defined(EVENT__HAVE_GETADDRINFO)
#define EVUTIL_AI_NUMERICHOST AI_NUMERICHOST
#else
#define EVUTIL_AI_NUMERICHOST 0x4000
#endif
#if defined(AI_NUMERICSERV) && defined(EVENT__HAVE_GETADDRINFO)
#define EVUTIL_AI_NUMERICSERV AI_NUMERICSERV
#else
#define EVUTIL_AI_NUMERICSERV 0x8000
#endif
#if defined(AI_V4MAPPED) && defined(EVENT__HAVE_GETADDRINFO)
#define EVUTIL_AI_V4MAPPED AI_V4MAPPED
#else
#define EVUTIL_AI_V4MAPPED 0x10000
#endif
#if defined(AI_ALL) && defined(EVENT__HAVE_GETADDRINFO)
#define EVUTIL_AI_ALL AI_ALL
#else
#define EVUTIL_AI_ALL 0x20000
#endif
#if defined(AI_ADDRCONFIG) && defined(EVENT__HAVE_GETADDRINFO)
#define EVUTIL_AI_ADDRCONFIG AI_ADDRCONFIG
#else
#define EVUTIL_AI_ADDRCONFIG 0x40000
#endif
/**@}*/
~~~


​	

~~~c
int evutil_getaddrinfo(const char *nodename, const char *servname, 
                       const struct addrinfo *hints_in, struct addrinfo **res);
~~~

~~~c

void
 evutil_freeaddrinfo(struct evutil_addrinfo *ai)
{
#ifdef EVENT__HAVE_GETADDRINFO
	if (!(ai->ai_flags & EVUTIL_AI_LIBEVENT_ALLOCATED)) {
		freeaddrinfo(ai);
		return;
	}
#endif
	while (ai) {
		struct evutil_addrinfo *next = ai->ai_next;
		if (ai->ai_canonname)
			mm_free(ai->ai_canonname);
		mm_free(ai);
		ai = next;
	}
}
~~~

<font color="#4bacc6">evutil_getaddrinfo()</font>函数试图根据hints给出的规则，解析指定的nodename和servname，建立一个<font color="#4bacc6">evutil_addrinfo</font>结构体链表，将其存储在\*res中。成功时函数返回0，失败时返回非零的<font color="#ff0000">错误码</font>。    

必须至少提供<font color="#00b050">nodename</font>和<font color="#00b050">servname</font>中的一个。如果提供了<font color="#00b050">nodename</font>，则它是<font color="#8064a2">IPv4</font>字面地址（如<font color="#de7802">127.0.0.1</font>）、IPv6字面地(如::1、或者是DNS名字（如<font color="#00b0f0">www.example.com</font>）。如果提供了servname，则它是某网络服务的符号名（如https），或者是一个包含十进制端口号的字符串（如443）。

如果不指定<font color="#00b050">servname</font>，则*res中的端口号将是零。如果不指定nodename，则*res中的地址要么是localhost(默认），要么是“任意”（如果设置了<font color="#8064a2">EVUTIL_AI_PASSIVE</font>）。

hints的ai_flags字段指示<font color="#3f3f3f">evutil_getaddrinfo</font>如何进行查询，它可以包含0个或者多个以或运算连接的下述标志：

- <font color="#8064a2">EVUTIL_AI_PASSIVE</font>

这个标志指示将地址用于监听，而不是连接。通常二者没有差别，除非nodename为空：对于连接，空的nodename表示localhost（127.0.0.1或者::1）；而对于监听，空的nodename表示任意（0.0.0.0或者::0）。

- <font color="#8064a2">EVUTIL_AI_CANONNAME</font>

如果设置了这个标志，则函数试图在ai_canonname字段中报告标准名称。

- <font color="#8064a2">EVUTIL_AI_NUMERICHOST</font>

如果设置了这个标志，函数仅仅解析数值类型的IPv4和IPv6地址；如果nodename要求名字查询，函数返回EVUTIL_EAI_NONAME错误。

- <font color="#8064a2">EVUTIL_AI_NUMERICSERV</font>

如果设置了这个标志，函数仅仅解析数值类型的服务名。如果servname不是空，也不是十进制整数，函数返回EVUTIL_EAI_NONAME错误。

- <font color="#8064a2">EVUTIL_AI_V4MAPPED</font>

这个标志表示，如果ai_family是AF_INET6，但是找不到IPv6地址，则应该以v4映射(v4-mapped)型IPv6地址的形式返回结果中的IPv4地址。当前evutil_getaddrinfo()不支持这个标志，除非操作系统支持它。

- <font color="#8064a2">EVUTIL_AI_ALL</font>

如果设置了这个标志和<font color="#8064a2">EVUTIL_AI_V4MAPPED</font>，则无论结果是否包含<font color="#8064a2">IPv6</font>地址，<font color="#8064a2">IPv4</font>地址都应该以v4映射型<font color="#8064a2">IPv6</font>地址的形式返回。当前<font color="#4bacc6">evutil_getaddrinfo()</font>不支持这个标志，除非操作系统支持它。

- <font color="#8064a2">EVUTIL_AI_ADDRCONFIG</font>

如果设置了这个标志，则只有系统拥有非本地的IPv4地址时，结果才包含IPv4地址；只有系统拥有非本地的<font color="#8064a2">IPv6</font>地址时，结果才包含<font color="#8064a2">IPv6</font>地址。

hints的<font color="#4bacc6">ai_family</font>字段指示<font color="#4bacc6">evutil_getaddrinfo()</font>应该返回哪个地址。字段值可以是<font color="#8064a2">AF_INET</font>，表示只请求<font color="#8064a2">IPv4</font>地址；也可以是AF_INET6，表示只请求IPv6地址；或者用<font color="#8064a2">AF_UNSPEC</font>表示请求所有可用地址。

hints的ai_socktype和ai_protocol字段告知evutil_getaddrinfo()将如何使用返回的地址。这两个字段值的意义与传递给socket()函数的socktype和protocol参数值相同。

成功时函数新建一个evutil_addrinfo结构体链表，存储在*res中，链表的每个元素通过ai_next指针指向下一个元素。因为链表是在堆上分配的，所以需要调用evutil_freeaddrinfo()进行释放。

如果失败，函数返回数值型的错误码：

-  **<font color="#8064a2">EVUTIL_EAI_ADDRFAMILY</font>**

	请求的地址族对nodename没有意义。

- **<font color="#8064a2">EVUTIL_EAI_AGAIN</font>**

	名字解析中发生可以恢复的错误，请稍后重试。

- **<font color="#8064a2">EVUTIL_EAI_FAIL</font>**

	名字解析中发生不可恢复的错误：解析器或者DNS服务器可能已经崩溃。

- **<font color="#8064a2">EVUTIL_EAI_BADFLAGS</font>**

	hints中的ai_flags字段无效。

- **<font color="#8064a2">EVUTIL_EAI_FAMILY</font>**

	不支持hints中的ai_family字段。

- **<font color="#8064a2">EVUTIL_EAI_MEMORY</font>**

	回应请求的过程耗尽内存。

- **<font color="#8064a2">EVUTIL_EAI_NODATA</font>**

	请求的主机不存在。

- **<font color="#8064a2">EVUTIL_EAI_SERVICE</font>**

	请求的服务不存在。

- **<font color="#8064a2">EVUTIL_EAI_SOCKTYPE</font>**

	不支持请求的套接字类型，或者套接字类型与ai_protocol不匹配。

- **<font color="#8064a2">EVUTIL_EAI_SYSTEM</font>**

	名字解析中发生其他系统错误，更多信息请检查errno。

- **<font color="#8064a2">EVUTIL_EAI_CANCEL</font>**

	应用程序在解析完成前请求取消。evutil_getaddrinfo()函数从不产生这个错误，但是后面描述的evdns_getaddrinfo()可能产生这个错误。
调用<font color="#4bacc6">evutil_gai_strerror()</font>可以将上述错误值转化成描述性的字符串。

## Attention 

如果操作系统定义了<font color="#4bacc6">addrinfo</font>结构体，则<font color="#4bacc6">evutil_addrinfo</font>仅仅是操作系统内置的<font color="#4bacc6">addrinfo</font>结构体的别名。类似地，如果操作系统定义了<font color="#8064a2">AI_*</font>标志，则相应的<font color="#8064a2">EVUTIL_AI_*</font>标志仅仅是本地标志的别名；如果操作系统定义了<font color="#8064a2">EAI_*</font>错误，则相应的<font color="#8064a2">EVUTIL_EAI_*</font>只是本地错误码的别名。



## example

~~~c
#include <event2/util.h>
#include <event2/event.h>

#include <sys/socket.h>
#include <netinet/in.h>
#include <sys/types.h>
#include <string.h>
#include <memory.h>
 
#include <assert.h>
#include <unistd.h>

/* Set N bytes of S to C.  */
extern void *memset (void *__s, int __c, size_t __n) __THROW __nonnull ((1));
evutil_socket_t 
get_tcp_socket_for_host(const char *hostname,ev_uint64_t port){
    char port_str[6];
    struct evutil_addrinfo hints;
    struct evutil_addrinfo *res = nullptr;

    int err;
    evutil_socket_t sock;
    evutil_snprintf(port_str,sizeof(port_str),"%llu",(unsigned long long)port);
    memset((&hints), 0, sizeof(hints));
    hints.ai_family = AF_UNSPEC;
    hints.ai_socktype = SOCK_STREAM;
    hints.ai_flags = EVUTIL_AI_ADDRCONFIG;
    hints.ai_protocol = IPPROTO_TCP;
    err = evutil_getaddrinfo(hostname,port_str,&hints,&res);
    if(err < 0){
         
        return -1;
    }
    assert(res);
    sock = socket(res->ai_family,res->ai_socktype,res->ai_protocol);
    if(sock < 0){
        
        EVUTIL_CLOSESOCKET(sock);
        return -1;
    }
    if(connect(sock,res->ai_addr,res->ai_addrlen) < 0){
        EVUTIL_CLOSESOCKET(sock);
        return -1;
    }
    return sock;
    
}
~~~

上述函数和常量是2.0.3-alpha版本新增加的，声明在event2/util.h中。

# Non-blocking name resolution using evdns_getaddrinfo()
通常的getaddrinfo()，以及上面的evutil_getaddrinfo()的问题是，它们是阻塞的：调用线程必须等待函数查询DNS服务器，等待回应。对于libevent，这可能不是期望的行为。

对于非阻塞式应用，libevent提供了一组函数用于启动DNS请求，让libevent等待服务器回应。

~~~c
/** Callback for evdns_getaddrinfo. */
typedef void (*evdns_getaddrinfo_cb)(int result, struct evutil_addrinfo *res, void *arg);
~~~

~~~c

/* State data used to implement an in-progress getaddrinfo. */
struct evdns_getaddrinfo_request {
	struct evdns_base *evdns_base;
	/* Copy of the modified 'hints' data that we'll use to build
	 * answers. */
	struct evutil_addrinfo hints;
	/* The callback to invoke when we're done */
	evdns_getaddrinfo_cb user_cb;
	/* User-supplied data to give to the callback. */
	void *user_data;
	/* The port to use when building sockaddrs. */
	ev_uint16_t port;
	/* The sub_request for an A record (if any) */
	struct getaddrinfo_subrequest ipv4_request;
	/* The sub_request for an AAAA record (if any) */
	struct getaddrinfo_subrequest ipv6_request;

	/* The cname result that we were told (if any) */
	char *cname_result;

	/* If we have one request answered and one request still inflight,
	 * then this field holds the answer from the first request... */
	struct evutil_addrinfo *pending_result;
	/* And this event is a timeout that will tell us to cancel the second
	 * request if it's taking a long time. */
	struct event timeout;

	/* And this field holds the error code from the first request... */
	int pending_error;
	/* If this is set, the user canceled this request. */
	unsigned user_canceled : 1;
	/* If this is set, the user can no longer cancel this request; we're
	 * just waiting for the free. */
	unsigned request_done : 1;
};

~~~

~~~c

struct evdns_getaddrinfo_request *evdns_getaddrinfo(struct evdns_base *dns_base,
    const char *nodename, const char *servname,
    const struct evutil_addrinfo *hints_in,
    evdns_getaddrinfo_cb cb, void *arg)；
    
void evdns_getaddrinfo_cancel(struct evdns_getaddrinfo_request *data)   
~~~

除了不会阻塞在DNS查询上，而是使用libevent的底层DNS机制进行查询外，evdns_getaddrinfo()和evutil_getaddrinfo()是一样的。因为函数不是总能立即返回结果，所以需要提供一个evdns_getaddrinfo_cb类型的回调函数，以及一个给回调函数的可选的用户参数。

此外，调用evdns_getaddrinfo()还要求一个evdns_base指针。evdns_base结构体为libevent的DNS解析器保持状态和配置。关于如何获取evdns_base指针，请看下一节。

如果失败或者立即成功，函数返回NULL。否则，函数返回一个evdns_getaddrinfo_request指针。在解析完成之前可以随时使用evdns_getaddrinfo_cancel()和这个指针来取消解析。

注意：不论evdns_getaddrinfo()是否返回NULL，是否调用了evdns_getaddrinfo_cancel()，回调函数总是会被调用。

evdns_getaddrinfo()内部会复制nodename、servname和hints参数，所以查询进行过程中不必保持这些参数有效。
## example
使用<font color="#8064a2">evdns_getaddrinfo()</font>的非阻塞查询

~~~c
#include <event2/event.h>
#include <event2/util.h>
#include <event2/event.h>

#include <sys/socket.h>
#include <netinet/in.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>


~~~

