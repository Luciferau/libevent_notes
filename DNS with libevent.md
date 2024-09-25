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
