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
#include <event2/dns.h>

#include <sys/socket.h>
#include <netinet/in.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>

int n_pending_requests = 0;

struct event_base *base = NULL;

struct user_data{
    char * name;/*the name we're resloving*/
    int idx;/*its  position on the command line*/
};


void callback(int errcode, struct evutil_addrinfo *addr, void *ptr) {
    // 将指针转换为用户数据结构
    struct user_data *data = (struct user_data*)ptr;
    const char *name = data->name;

    if (errcode) {
        // 如果出错，打印错误信息
        printf("%d %s -> %s\n", data->idx, name, evutil_gai_strerror(errcode));
    } else {
        // 打印成功的地址信息
        struct evutil_addrinfo *ai;
        printf("%d. %s", data->idx, name);

        // 如果存在规范名称，则打印
        if (addr->ai_canonname) {
            printf("[%s]", addr->ai_canonname);
        }
        puts("");

        // 遍历地址链表
        for (ai = addr; ai; ai = ai->ai_next) {
            char buf[128];
            const char *s = NULL;

            // 根据地址族处理不同类型的地址
            if (ai->ai_family == AF_INET) {
                struct sockaddr_in *sin = (struct sockaddr_in *)ai->ai_addr;
                s = evutil_inet_ntop(AF_INET, &sin->sin_addr, buf, sizeof(buf));
            } else if (ai->ai_family == AF_INET6) {
                struct sockaddr_in6 *sin6 = (struct sockaddr_in6 *)ai->ai_addr;
                s = evutil_inet_ntop(AF_INET6, &sin6->sin6_addr, buf, sizeof(buf));
            }

            // 如果成功转换地址，打印它
            if (s) {
                printf(" -> %s\n", s);
            }
        }

        // 释放地址信息结构
        evutil_freeaddrinfo(addr);
    }

    // 释放用户数据中的名称和数据结构
    free(data->name);
    free(data);

    // 如果没有待处理请求，退出事件循环
    if (--n_pending_requests == 0) {
        event_base_loopexit(base, NULL);
    }
}


int main(int argc, char **argv) {

    int i ;
    struct evdns_base *dnsbase;
    if(argc == 1){
        puts("No address given");
        return 0;
    }

    base = event_base_new();
    if(!base){
        puts("event_base_new failed");
        return 1;
    }

    dnsbase = evdns_base_new(base, 1);

    if(!dnsbase)
        return 2;


    for(i = 1; i < argc; ++i){
        struct evutil_addrinfo hints;
        struct evdns_getaddrinfo_request *req;
        struct user_data *data;
        memset(&hints, 0, sizeof(hints));
        hints.ai_family = AF_UNSPEC;
        hints.ai_socktype = SOCK_STREAM;
        hints.ai_flags = EVUTIL_AI_CANONNAME;
        hints.ai_protocol = IPPROTO_TCP;

        if(!(data = (struct user_data*)malloc(sizeof(struct user_data)))){
            puts("malloc failed");
            return 3;
        }
        
        if(!(data->name = strdup(argv[i]))){
            puts("strdup failed");
            return 4;
        }

        data->idx = i;
        ++n_pending_requests;
        req = evdns_getaddrinfo(dnsbase, argv[i], NULL,&hints, callback,data);

        if(req == NULL){
            puts("evdns_getaddrinfo failed");
            return 5;
        }


    }

    if(n_pending_requests)
        event_base_dispatch(base);
    evdns_base_free(dnsbase,0);
    event_base_free(base);
}
~~~

上述函数是2.0.3-alpha版本新增加的，声明在event2/dns.h中。


# Create and configure evdns_base
使用evdns进行非阻塞DNS查询之前需要配置一个evdns_base。evdns_base存储名字服务器列表和DNS配置选项.
跟踪活动的、进行中的DNS请求。
~~~c
struct evdns_base * evdns_base_new(struct event_base *event_base, int flags);
void evdns_base_free(struct evdns_base *base, int fail_requests);
~~~
成功时evdns_base_new()返回一个新建的evdns_base，失败时返回NULL。如果initialize参数为true，函数试图根据操作系统的默认值配置evdns_base；否则，函数让evdns_base为空，不配置名字服务器和选项。

可以用evdns_base_free()释放不再使用的evdns_base。如果fail_request参数为true，函数会在释放evdns_base前让所有进行中的请求使用取消错误码调用其回调函数。
## Initialize evdns using system configuration

如果需要更多地控制evdns_base如何初始化，可以为evdns_base_new()的initialize参数传递0，然后调用下述函数。

~~~c
#define DNS_OPTION_HOSTSFILE 1
#define DNS_OPTION_NAMESERVERS 2
#define DNS_OPTION_MISC 4
#define DNS_OPTION_HOSTSFILE 8
#define DNS_OPTIONS_ALL 15

int evdns_base_resolv_conf_parse(struct evdns_base *base, int flags, const char *const filename);

#ifdef WIN32
    int evdns_base_resolv_config_windows_namseservers(struct evdns_base *);
    #define EVDNS_BASE_CONFIG_WINDOWS_NAMESERVERS_IMPLEMENTED
#endif

~~~

evdns_base_resolv_conf_parse()函数扫描resolv.conf格式的文件filename，从中读取flags指示的选项（关于resolv.conf文件的更多信息，请看Unix手册）。

- <font color="#8064a2">DNS_OPTION_SEARCH</font>

	请求从resolv.conf文件读取domain和search字段以及ndots选项，使用它们来确定使用哪个域（如果存在）来搜索不是全限定的主机名。

- <font color="#8064a2">DNS_OPTION_NAMESERVERS</font>

	请求从resolv.conf中读取名字服务器地址。

- <font color="#8064a2">DNS_OPTION_MISC</font>

	请求从resolv.conf文件中读取其他配置选项。

- <font color="#8064a2">DNS_OPTION_HOSTSFILE</font>

	请求从/etc/hosts文件读取主机列表。

- <font color="#8064a2">DNS_OPTION_ALL</font>

	请求从resolv.conf文件获取尽量多的信息。

Windows中没有可以告知名字服务器在哪里的resolv.conf文件，但可以用evdns_base_config_windows_nameservers()函数从注册表（或者NetworkParams，或者其他隐藏的地方）读取名字服务器。
## resolv.conf File Format

	resolv.conf是一个文本文件，每一行要么是空行，要么包含以#开头的注释，要么由一个跟随零个或者多个参数的标记组成。可以识别的标记有：

- <font color="#00b050">nameserver</font>

	必须后随一个名字服务器的IP地址。作为一个扩展，libevent允许使用IP:Port或者[IPv6]:port语法为名字服务器指定非标准端口。

- <font color="#00b050">domain</font>

本地域名

- <font color="#00b050">search</font>

	解析本地主机名时要搜索的名字列表。如果不能正确解析任何含有少于“ndots”个点的本地名字，则在这些域名中进行搜索。比如说，如果“search”字段值为example.com，“ndots”为1，则用户请求解析“www”时，函数认为那是“www.example.com”。

- <font color="#00b050">options</font>

空格分隔的选项列表。选项要么是空字符串，要么具有格式option:value（如果有参数）。可识别的选项有：
						    <font color="#00b050">ndots:INTEGER</font>
	    用于配置搜索，请参考上面的“search”，默认值是1。
	
	 timeout:FLOAT
	
		等待DNS服务器响应的时间，单位是秒。默认值为5秒。
	
	 max-timeouts:INT
	
		名字服务器响应超时几次才认为服务器当机？默认是3次。
	
	 max-inflight:INT
	
		最多允许多少个未决的DNS请求？（如果试图发出多于这么多个请求，则过多的请求将被延迟，直到某个请求被响应或者超时）。默认值是XXX。
	
	 attempts:INT
	
		在放弃之前重新传输多少次DNS请求？默认值是XXX。
如果非零，evdns会为发出的DNS请求设置随机的事务ID，并且确认回应具有同样的随机事务ID值。这种称作“0x20 hack”的机制可以在一定程度上阻止对DNS的简单激活事件攻击。这个选项的默认值是1。

（这段原文不易理解，译文可能很不准确。这里给出原文：If nonzero,we randomize the case on outgoing DNS requests and make sure that replies have the same case as our requests.This so-called "0x20 hack" can help prevent some otherwise simple active events against DNS.）

	 bind-to:ADDRESS
	
		如果提供，则向名字服务器发送数据之前绑定到给出的地址。对于2.0.4-alpha版本，这个设置仅应用于后面的名字服务器条目。
	
	 initial-probe-timeout:FLOAT
	
		确定名字服务器当机后，libevent以指数级降低的频率探测服务器以判断服务器是否恢复。这个选项配置（探测时间间隔）序列中的第一个
		超时，单位是秒。默认值是10。
	
	  getaddrinfo-allow-skew:FLOAT
	
		同时请求IPv4和IPv6地址时，evdns_getaddrinfo()用单独的DNS请求包分别请求两种地址，
		因为有些服务器不能在一个包中同时处理两种请求。服务器回应一种地址类型后，函数等待一段时间确定另一种类型的地址是否到达。
		这个选项配置等待多长时间，单位是秒。默认值是3秒。不识别的字段和选项会被忽略。
## Manually configure evdns
如果需要更精细地控制evdns的行为，可以使用下述函数：

~~~c

int evdns_base_nameserver_sockaddr_add(struct evdns_base *base, const struct sockaddr *sa, socklen_t len,
									   unsigned int flags);
int evdns_base_nameserver_ip_add(struct evdns_base *base, const char *ip_as_string);
int evdns_base_load_hosts(struct evdns_base *base, const char *hosts_fname);

void evdns_base_search_clear(struct evdns_base *base);
void evdns_base_search_add(struct evdns_base *base, const char *domain);
void evdns_base_search_ndots_set(struct evdns_base *base, int ndots);

int evdns_base_set_option(struct evdns_base *base, const char *option, const char *val);
int evdns_base_count_nameservers(struct evdns_base *base);
~~~

evdns_base_nameserver_sockaddr_add()函数通过地址向evdns_base添加名字服务器。当前忽略flags参数，为向前兼容考虑，应该传入0。成功时函数返回0，失败时返回负值。（这个函数在2.0.7-rc版本加入）

evdns_base_nameserver_ip_add()函数向evdns_base加入字符串表示的名字服务器，格式可以是IPv4地址、IPv6地址、带端口号的IPv4地址（IPv4:Port)，或者带端口号的IPv6地址（[IPv6]:Port）。成功时函数返回0，失败时返回负值。

evdns_base_load_hosts()函数从hosts_fname文件中载入主机文件（格式与/etc/hosts相同）。成功时函数返回0，失败时返回负值。

evdns_base_search_clear()函数从evdns_base中移除所有（通过search配置的）搜索后缀；evdns_base_search_add()则添加后缀。

evdns_base_set_option()函数设置evdns_base中某选项的值。选项和值都用字符串表示。（2.0.3版本之前，选项名后面必须有一个冒号）

解析一组配置文件后，可以使用evdns_base_count_nameservers()查看添加了多少个名字服务器。

## Library configuration
有一些为evdns模块设置库级别配置的函数：

~~~c
/**
  A callback that is invoked when a log message is generated

  @param is_warning indicates if the log message is a 'warning'
  @param msg the content of the log message
 */
typedef void (*evdns_debug_log_fn_type)(int is_warning, const char *msg);
void evdns_set_log_fn(evdns_debug_log_fn_type);
void evdns_set_transaction_id_fn(evdns_debug_log_fn_type);
~~~

因为历史原因，evdns子系统有自己单独的日志。evdns_set_log_fn()可以设置一个回调函数，以便在丢弃日志消息前做一些操作。

为安全起见，evdns需要一个良好的随机数发生源：使用0x20 hack的时候，evdns通过这个源来获取难以猜测（hard-to-guess）的事务ID以随机化查询（请参考“randomize-case”选项）。然而，较老版本的libevent没有自己的安全的RNG（随机数发生器）。此时可以通过调用evdns_set_transaction_id_fn()，传入一个返回难以预测（hard-to-predict）的两字节无符号整数的函数，来为evdns设置一个更好的随机数发生器。

2.0.4-alpha以及后续版本中，libevent有自己内置的安全的RNG，evdns_set_transaction_id_fn()就没有效果了。



# Low-level DNS interface
有时候需要启动能够比从evdns_getaddrinfo()获取的DNS请求进行更精细控制的特别的DNS请求，libevent也为此提供了接口。

## Missing features
当前libevent的DNS支持缺少其他底层DNS系统所具有的一些特征，如支持任意请求类型和TCP请求。如果需要evdns所不具有的特征，欢迎贡献一个补丁。也可以看看其他全特征的DNS库，如c-ares。

~~~c
/**
 * The callback that contains the results from a lookup.
 * - result is one of the DNS_ERR_* values (DNS_ERR_NONE for success)
 * - type is either DNS_IPv4_A or DNS_PTR or DNS_IPv6_AAAA
 * - count contains the number of addresses of form type
 * - ttl is the number of seconds the resolution may be cached for.
 * - addresses needs to be cast according to type.  It will be an array of
 *   4-byte sequences for ipv4, or an array of 16-byte sequences for ipv6,
 *   or a nul-terminated string for PTR.
 */
typedef void (*evdns_callback_type) (int result, char type, int count, int ttl, 
									 void *addresses, void *arg);

struct evdns_request* 
	evdns_base_resolve_ipv4(evutil_socket_t fd, const char *hostname, 
                                              evdns_callback_type callback, void *arg);

struct evdns_request* 
	evdns_base_resolve_ipv6(struct evdns_base *base, const char *name,
                                              int flags, evdns_callback_type callback, void *ptr);

struct evdns_request* 
	evdns_base_resolve_reverse(struct evdns_base *base, const struct in_addr *in,
                                                 int flags, evdns_callback_type callback, void *ptr);

struct evdns_request* 
	evdns_base_resolve_reverse_ipv6(struct evdns_base *base, const struct in6_addr *in,
                                                      int flags, evdns_callback_type callback, void *ptr);
~~~

这些解析函数为一个特别的记录发起DNS请求。每个函数要求一个evdns_base用于发起请求、一个要查询的资源（正向查询时的主机名，或者反向查询时的地址）、一组用以确定如何进行查询的标志、一个查询完成时调用的回调函数，以及一个用户提供的传给回调函数的指针。

flags参数可以是0，也可以用DNS_QUERY_NO_SEARCH明确禁止原始查询失败时在搜索列表中进行搜索。DNS_QUERY_NO_SEARCH对反向查询无效，因为反向查询不进行搜索。

请求完成（不论是否成功）时回调函数会被调用。回调函数的参数是指示成功或者错误码（参看下面的DNS错误表）的result、一个记录类型（DNS_IPv4_A、DNS_IPv6_AAAA，或者DNS_PTR）、addresses中的记录数、以秒为单位的存活时间、地址（查询结果），以及用户提供的指针。

发生错误时传给回调函数的addresses参数为NULL。没有错误时：对于PTR记录，addresses是空字符结束的字符串；对于IPv4记录，则是网络字节序的四字节地址值数组；对于IPv6记录，则是网络字节序的16字节记录数组。（注意：即使没有错误，addresses的个数也可能是0。名字存在，但是没有请求类型的记录时就会出现这种情况）

可能传递给回调函数的错误码如下：

## DNS ERRORCODE

| <center></center>错误码                              | 意义             |
| ------------------------------------------------- | -------------- |
| <font color="#8064a2">DNS_ERR_NONE</font>         | 没有错误           |
| <font color="#8064a2">DNS_ERR_FORMAT</font>       | 服务器不识别查询请求     |
| <font color="#8064a2">DNS_ERR_SERVERFAILED</font> | 服务器内部错误        |
| <font color="#8064a2">DNS_ERR_NOTEXIST</font>     | 没有给定名字的记录      |
| <font color="#8064a2">DNS_ERR_NOTIMPL</font>      | 服务器不识别这种类型的查询  |
| <font color="#8064a2">DNS_ERR_REFUSED</font>      | 因为策略设置，服务器拒绝查询 |
| <font color="#8064a2">DNS_ERR_TRUNCATED</font>    | DNS记录不适合UDP分组  |
| <font color="#8064a2">DNS_ERR_UNKNOWN</font>      | 未知的内部错误        |
| <font color="#8064a2">DNS_ERR_TIMEOUT</font>      | 等待超时           |
| <font color="#8064a2">DNS_ERR_SHUTDOWN</font>     | 用户请求关闭evdns系统  |
| <font color="#8064a2">DNS_ERR_CANCEL</font>       | 用户请求取消查询       |

可以用下述函数将错误码转换成错误描述字符串

~~~c
const char *
evdns_err_to_string(int err)
{
    switch (err) {
	case DNS_ERR_NONE: return "no error";
	case DNS_ERR_FORMAT: return "misformatted query";
	case DNS_ERR_SERVERFAILED: return "server failed";
	case DNS_ERR_NOTEXIST: return "name does not exist";
	case DNS_ERR_NOTIMPL: return "query not implemented";
	case DNS_ERR_REFUSED: return "refused";

	case DNS_ERR_TRUNCATED: return "reply truncated or ill-formed";
	case DNS_ERR_UNKNOWN: return "unknown";
	case DNS_ERR_TIMEOUT: return "request timed out";
	case DNS_ERR_SHUTDOWN: return "dns subsystem shut down";
	case DNS_ERR_CANCEL: return "dns request canceled";
	case DNS_ERR_NODATA: return "no records in the reply";
	default: return "[Unknown error code]";
    }
}	
~~~

每个解析函数都返回不透明的evdns_request结构体指针。回调函数被调用前的任何时候都可以用这个指针来取消请求：

