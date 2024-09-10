<event2/util.h>定义了很多在实现可移植应用时有用的函数，libevent内部也使用这些类型和函数。

# Base type
## <font color="#4bacc6">evutil_socket_t</font>
在除Windows之外的大多数地方，套接字是个整数，操作系统按照数值次序进行处理。然而，使用Windows套接字API时，socket具有类型SOCKET，它实际上是个类似指针的句柄，收到这个句柄的次序是未定义的。在Windows中，libevent定义evutil_socket_t类型为整型指针，可以处理socket()或者accept()的输出，而没有指针截断的风险。

~~~c
/**

 * A type wide enough to hold the output of "socket()" or "accept()".  On

 * Windows, this is an intptr_t; elsewhere, it is an int. */

#ifdef _WIN32

#define evutil_socket_t intptr_t

#else

#define evutil_socket_t int

#endi
~~~


# Standard int types

落后于21世纪的C系统常常没有实现C99标准规定的stdint.h头文件。考虑到这种情况，
libevent定义了来自于stdint.h的、位宽度确定（bit-width-specific）的整数类型：


| Type                                     | Width | Signed | Maximum                                    | Minimum      |
| ---------------------------------------- | ----- | ------ | ------------------------------------------ | ------------ |
| <font color="#4bacc6">ev_uint64_t</font> | 64    | No     | <font color="#8064a2">EV_UINT64_MAX</font> | 0            |
| <font color="#4bacc6">ev_int64_t</font>  | 64    | Yes    | <font color="#8064a2">EV_INT64_MAX</font>  | EV_INT64_MIN |
| <font color="#4bacc6">ev_uint32_t</font> | 32    | No     | <font color="#8064a2">EV_UINT32_MAX</font> | 0            |
| <font color="#4bacc6">ev_int32_t</font>  | 32    | Yes    | <font color="#8064a2">EV_INT32_MAX</font>  | EV_INT32_MIN |
| <font color="#4bacc6">ev_uint16_t</font> | 16    | No     | <font color="#8064a2">EV_UINT16_MAX</font> | 0            |
| <font color="#4bacc6">ev_int16_t</font>  | 16    | Yes    | <font color="#8064a2">EV_INT16_MAX</font>  | EV_INT16_MIN |
| <font color="#4bacc6">ev_uint8_t</font>  | 8     | No     | <font color="#8064a2">EV_UINT8_MAX</font>  | 0            |
| <font color="#4bacc6">ev_int8_t</font>   | 8     | Yes    | <font color="#8064a2">EV_INT8_MAX</font>   | EV_INT8_MIN  |
|                                          |       |        |                                            |              |
跟C99标准一样，这些类型都有明确的位宽度。

这些类型由1.4.0-alpha版本引入。MAX/MIN常量首次出现在2.0.4-alpha版本。
~~~c
  

/**

 * @name Standard integer types.

 *

 * Integer type definitions for types that are supposed to be defined in the

 * C99-specified stdint.h.  Shamefully, some platforms do not include

 * stdint.h, so we need to replace it.  (If you are on a platform like this,

 * your C headers are now over 10 years out of date.  You should bug them to

 * do something about this.)

 *

 * We define:

 *

 * <dl>

 *   <dt>ev_uint64_t, ev_uint32_t, ev_uint16_t, ev_uint8_t</dt>

 *      <dd>unsigned integer types of exactly 64, 32, 16, and 8 bits

 *          respectively.</dd>

 *    <dt>ev_int64_t, ev_int32_t, ev_int16_t, ev_int8_t</dt>

 *      <dd>signed integer types of exactly 64, 32, 16, and 8 bits

 *          respectively.</dd>

 *    <dt>ev_uintptr_t, ev_intptr_t</dt>

 *      <dd>unsigned/signed integers large enough

 *      to hold a pointer without loss of bits.</dd>

 *    <dt>ev_ssize_t</dt>

 *      <dd>A signed type of the same size as size_t</dd>

 *    <dt>ev_off_t</dt>

 *      <dd>A signed type typically used to represent offsets within a

 *      (potentially large) file</dd>

 *

 * @{

 */

#ifdef EVENT__HAVE_UINT64_T

#define ev_uint64_t uint64_t

#define ev_int64_t int64_t

#elif defined(_WIN32)

#define ev_uint64_t unsigned __int64

#define ev_int64_t signed __int64

#elif EVENT__SIZEOF_LONG_LONG == 8

#define ev_uint64_t unsigned long long

#define ev_int64_t long long

#elif EVENT__SIZEOF_LONG == 8

#define ev_uint64_t unsigned long

#define ev_int64_t long

#elif defined(EVENT_IN_DOXYGEN_)

#define ev_uint64_t ...

#define ev_int64_t ...

#else

#error "No way to define ev_uint64_t"

#endif

  

#ifdef EVENT__HAVE_UINT32_T

#define ev_uint32_t uint32_t

#define ev_int32_t int32_t

#elif defined(_WIN32)

#define ev_uint32_t unsigned int

#define ev_int32_t signed int

#elif EVENT__SIZEOF_LONG == 4

#define ev_uint32_t unsigned long

#define ev_int32_t signed long

#elif EVENT__SIZEOF_INT == 4

#define ev_uint32_t unsigned int

#define ev_int32_t signed int

#elif defined(EVENT_IN_DOXYGEN_)

#define ev_uint32_t ...

#define ev_int32_t ...

#else

#error "No way to define ev_uint32_t"

#endif

  

#ifdef EVENT__HAVE_UINT16_T

#define ev_uint16_t uint16_t

#define ev_int16_t  int16_t

#elif defined(_WIN32)

#define ev_uint16_t unsigned short

#define ev_int16_t  signed short

#elif EVENT__SIZEOF_INT == 2

#define ev_uint16_t unsigned int

#define ev_int16_t  signed int

#elif EVENT__SIZEOF_SHORT == 2

#define ev_uint16_t unsigned short

#define ev_int16_t  signed short

#elif defined(EVENT_IN_DOXYGEN_)

#define ev_uint16_t ...

#define ev_int16_t ...

#else

#error "No way to define ev_uint16_t"

#endif

  

#ifdef EVENT__HAVE_UINT8_T

#define ev_uint8_t uint8_t

#define ev_int8_t int8_t

#elif defined(EVENT_IN_DOXYGEN_)

#define ev_uint8_t ...

#define ev_int8_t ...

#else

#define ev_uint8_t unsigned char

#define ev_int8_t signed char

#endif

  

#ifdef EVENT__HAVE_UINTPTR_T

#define ev_uintptr_t uintptr_t

#define ev_intptr_t intptr_t

#elif EVENT__SIZEOF_VOID_P <= 4

#define ev_uintptr_t ev_uint32_t

#define ev_intptr_t ev_int32_t

#elif EVENT__SIZEOF_VOID_P <= 8

#define ev_uintptr_t ev_uint64_t

#define ev_intptr_t ev_int64_t

#elif defined(EVENT_IN_DOXYGEN_)

#define ev_uintptr_t ...

#define ev_intptr_t ...

#else

#error "No way to define ev_uintptr_t"

#endif
~~~

## Definition of maximum and minimum values
~~~c
#ifndef EVENT__HAVE_STDINT_H

#define EV_UINT64_MAX ((((ev_uint64_t)0xffffffffUL) << 32) | 0xffffffffUL)

#define EV_INT64_MAX  ((((ev_int64_t) 0x7fffffffL) << 32) | 0xffffffffL)

#define EV_INT64_MIN  ((-EV_INT64_MAX) - 1)

#define EV_UINT32_MAX ((ev_uint32_t)0xffffffffUL)

#define EV_INT32_MAX  ((ev_int32_t) 0x7fffffffL)

#define EV_INT32_MIN  ((-EV_INT32_MAX) - 1)

#define EV_UINT16_MAX ((ev_uint16_t)0xffffUL)

#define EV_INT16_MAX  ((ev_int16_t) 0x7fffL)

#define EV_INT16_MIN  ((-EV_INT16_MAX) - 1)

#define EV_UINT8_MAX  255

#define EV_INT8_MAX   127

#define EV_INT8_MIN   ((-EV_INT8_MAX) - 1)

#else

#define EV_UINT64_MAX UINT64_MAX

#define EV_INT64_MAX  INT64_MAX

#define EV_INT64_MIN  INT64_MIN

#define EV_UINT32_MAX UINT32_MAX

#define EV_INT32_MAX  INT32_MAX

#define EV_INT32_MIN  INT32_MIN

#define EV_UINT16_MAX UINT16_MAX

#define EV_INT16_MIN  INT16_MIN

#define EV_INT16_MAX  INT16_MAX

#define EV_UINT8_MAX  UINT8_MAX

#define EV_INT8_MAX   INT8_MAX

#define EV_INT8_MIN   INT8_MIN

/** @} */

#endif
~~~


# Various compatibility types

在有ssize_t（有符号的size_t）类型的平台上，ev_ssize_t定义为ssize_t；而在没有的平台上，则定义为某合理的默认类型。
ev_ssize_t类型的最大可能值是EV_SSIZE_MAX；最小可能值是EV_SSIZE_MIN。（在平台没有定义SIZE_MAX的时候，size_t类型的最大可能值是EV_SIZE_MAX）.

ev_off_t用于代表文件或者内存块中的偏移量。在有合理off_t类型定义的平台，它被定义为off_t；在Windows上则定义为ev_int64_t。

某些套接字API定义了socklen_t长度类型，有些则没有定义。在有这个类型定义的平台中，ev_socklen_t定义为socklen_t，在没有的平台上则定义为合理的默认类型。

ev_intptr_t是一个有符号整数类型，足够容纳指针类型而不会产生截断；而ev_uintptr_t则是相应的无符号类型。


ev_ssize_t类型由2.0.2-alpha版本加入。ev_socklen_t类型由2.0.3-alpha版本加入。ev_intptr_t与ev_uintptr_t类型，以及EV_SSIZE_MAX/MIN宏定义由2.0.4-alpha版本加入。ev_off_t类型首次出现在2.0.9-rc版本。

# Timer portable functions
不是每个平台都定义了标准timeval操作函数，所以libevent也提供了自己的实现。

## evutil_timeradd() evutil_timersub()
~~~
#define evutil_timeradd(tvp, uvp, vvp) timeradd((tvp), (uvp), (vvp))

#define evutil_timersub(tvp, uvp, vvp) timersub((tvp), (uvp), (vvp))
~~~


~~~c
#ifdef EVENT__HAVE_TIMERADD

#define evutil_timeradd(tvp, uvp, vvp) timeradd((tvp), (uvp), (vvp))

#define evutil_timersub(tvp, uvp, vvp) timersub((tvp), (uvp), (vvp))

#else

#define evutil_timeradd(tvp, uvp, vvp)                  \

    do {                                \

        (vvp)->tv_sec = (tvp)->tv_sec + (uvp)->tv_sec;      \

        (vvp)->tv_usec = (tvp)->tv_usec + (uvp)->tv_usec;       \

        if ((vvp)->tv_usec >= 1000000) {            \

            (vvp)->tv_sec++;                \

            (vvp)->tv_usec -= 1000000;          \

        }                           \

    } while (0)

#define evutil_timersub(tvp, uvp, vvp)                  \

    do {                                \

        (vvp)->tv_sec = (tvp)->tv_sec - (uvp)->tv_sec;      \

        (vvp)->tv_usec = (tvp)->tv_usec - (uvp)->tv_usec;   \

        if ((vvp)->tv_usec < 0) {               \

            (vvp)->tv_sec--;                \

            (vvp)->tv_usec += 1000000;          \

        }                           \

    } while (0)

#endif /* !EVENT__HAVE_TIMERADD */
~~~

这些宏分别对前两个参数进行加或者减运算，将结果存放到第三个参数中。
~~~c
#ifdef __USE_MISC

/* Convenience macros for operations on timevals.

   NOTE: `timercmp' does not work for >= or <=.  */

# define timerisset(tvp)   ((tvp)->tv_sec || (tvp)->tv_usec)

# define timerclear(tvp)   ((tvp)->tv_sec = (tvp)->tv_usec = 0)

# define timercmp(a, b, CMP)                       \

  (((a)->tv_sec == (b)->tv_sec)                    \

   ? ((a)->tv_usec CMP (b)->tv_usec)                     \

   : ((a)->tv_sec CMP (b)->tv_sec))

# define timeradd(a, b, result)                       \

  do {                                 \

    (result)->tv_sec = (a)->tv_sec + (b)->tv_sec;              \

    (result)->tv_usec = (a)->tv_usec + (b)->tv_usec;              \

    if ((result)->tv_usec >= 1000000)                    \

      {                                \

   ++(result)->tv_sec;                       \

   (result)->tv_usec -= 1000000;                   \

      }                                \

  } while (0)

# define timersub(a, b, result)                       \

  do {                                 \

    (result)->tv_sec = (a)->tv_sec - (b)->tv_sec;              \

    (result)->tv_usec = (a)->tv_usec - (b)->tv_usec;              \

    if ((result)->tv_usec < 0) {                   \

      --(result)->tv_sec;                       \

      (result)->tv_usec += 1000000;                   \

    }                               \

  } while (0)

#endif   /* Misc.  */
~~~

## evutil_timerisse()
~~~c
# define timerisset(tvp)   ((tvp)->tv_sec || (tvp)->tv_usec)

# define timerclear(tvp)   ((tvp)->tv_sec = (tvp)->tv_usec = 0)
~~~

清除timeval会将其值设置为0。evutil_timerisset宏检查timeval是否已经设置，如果已经设置为非零值，返回ture，否则返回false。

## timercmp()
~~~c
# define timercmp(a, b, CMP)                       \

  (((a)->tv_sec == (b)->tv_sec)                    \

   ? ((a)->tv_usec CMP (b)->tv_usec)                     \

   : ((a)->tv_sec CMP (b)->tv_sec))

~~~
evutil_timercmp宏比较两个timeval，如果其关系满足cmp关系运算符，返回true。比如说，evutil_timercmp(t1,t2,<=)的意思是“是否t1<=t2？”。注意：与某些操作系统版本不同的是，libevent的时间比较支持所有C关系运算符（也就是<、>、\==、!=、<=和>=）。

## evutil_gettimeofday
~~~
#define evutil_gettimeofday(tv, tz) gettimeofday((tv), (tz))
~~~

~~~c
extern int gettimeofday (struct timeval *__restrict __tv,
	void *__restrict __tz) __THROW __nonnull ((1));
~~~
evutil_gettimeofdy（）函数设置tv为当前时间，tz参数未使用。           
~~~c
#include <bits/types/struct_timeval.h>

#include <event2/event.h>  

#include <event2/util.h>

#include <ctime>

#include <unistd.h>

  

void func()

{

    struct timeval tv1,tv2,tv3;

    tv1.tv_sec = 5; tv1.tv_usec = 500*1000;

    evutil_gettimeofday(&tv2,NULL);

    evutil_timeradd(&tv1,&tv2,&tv3);

    if(evutil_timercmp(&tv1,&tv2,==))

        puts("tv1 == tv2");

    if(evutil_timercmp(&tv1,&tv2,>=))

        puts("tv1 >= tv2");

    if(evutil_timercmp(&tv1,&tv2,<))

        puts("tv1 < tv2");

}
~~~

除evutil_gettimeofday（）由2.0版本引入外，这些函数由1.4.0-beta版本引入。

注意：在1.4.4之前的版本中使用<=或者>=是不安全的。

`evutil_gettimeofday()` 是 `libevent` 库中的一个函数，用于获取当前的时间。它的功能是填充一个 `struct timeval` 结构体，该结构体包含当前的秒数和微秒数。这个函数通常用于需要精确时间戳或时间间隔计算的场景。

# Socket API compatibility

本节由于历史原因而存在：Windows从来没有以良好兼容的方式实现Berkeley套接字API。

~~~c
int evutil_closesocket(evutil_socket_t sock)
~~~

这个接口用于关闭套接字。在Unix中，它是close()的别名；在Windows中，它调用closesocket()。（在Windows中不能将close()用于套接字，也没有其他系统定义了closesocket()）

evutil_closesocket()函数在2.0.5-alpha版本引入。在此之前，需要使用<font color="#8064a2">EVUTIL_CLOSESOCKE</font>T宏。

~~~c
int evutil_closesocket(evutil_socket_t sock)

{

#ifndef _WIN32

    return close(sock);

#else

    return closesocket(sock);

#endif

}

#define EVUTIL_CLOSESOCKET(s) evutil_closesocket(s)
~~~

## EVUTIL_*
~~~C
EVENT2_EXPORT_SYMBOL

int evutil_make_tcp_listen_socket_deferred(evutil_socket_t sock);

  

#ifdef _WIN32

/** Return the most recent socket error.  Not idempotent on all platforms. */

#define EVUTIL_SOCKET_ERROR() WSAGetLastError()

/** Replace the most recent socket error with errcode */

#define EVUTIL_SET_SOCKET_ERROR(errcode)        \

    do { WSASetLastError(errcode); } while (0)

/** Return the most recent socket error to occur on sock. */

EVENT2_EXPORT_SYMBOL

int evutil_socket_geterror(evutil_socket_t sock);

/** Convert a socket error to a string. */

EVENT2_EXPORT_SYMBOL

const char *evutil_socket_error_to_string(int errcode);

#define EVUTIL_INVALID_SOCKET INVALID_SOCKET

#elif defined(EVENT_IN_DOXYGEN_)

/**

   @name Socket error functions

  

   These functions are needed for making programs compatible between

   Windows and Unix-like platforms.

  

   You see, Winsock handles socket errors differently from the rest of

   the world.  Elsewhere, a socket error is like any other error and is

   stored in errno.  But winsock functions require you to retrieve the

   error with a special function, and don't let you use strerror for

   the error codes.  And handling EWOULDBLOCK is ... different.

  

   @{

*/

/** Return the most recent socket error.  Not idempotent on all platforms. */

#define EVUTIL_SOCKET_ERROR() ...

/** Replace the most recent socket error with errcode */

#define EVUTIL_SET_SOCKET_ERROR(errcode) ...

/** Return the most recent socket error to occur on sock. */

#define evutil_socket_geterror(sock) ...

/** Convert a socket error to a string. */

#define evutil_socket_error_to_string(errcode) ...

#define EVUTIL_INVALID_SOCKET -1

/**@}*/

#else /** !EVENT_IN_DOXYGEN_ && !_WIN32 */

#define EVUTIL_SOCKET_ERROR() (errno)

#define EVUTIL_SET_SOCKET_ERROR(errcode)        \

        do { errno = (errcode); } while (0)

#define evutil_socket_geterror(sock) (errno)

#define evutil_socket_error_to_string(errcode) (strerror(errcode))

#define EVUTIL_INVALID_SOCKET -1

#endif /** !_WIN32 */
~~~

这些宏访问和操作套接字错误代码。<font color="#8064a2">EVUTIL_SOCKET_ERROR（）</font>返回本线程最后一次套接字操作的全局错误号，evutil_socket_geterror（）则返回某特定套接字的错误号。（在类Unix系统中都是errno）<font color="#8064a2">EVUTIL_SET_SOCKET_ERROR</font>()修改当前套接字错误号（与设置Unix中的errno类似），<font color="#8064a2">evutil_socket_error_to_string</font>（）返回代表某给定套接字错误号的字符串（与Unix中的strerror()类似）。

（因为对于来自套接字函数的错误，Windows不使用errno，而是使用WSAGetLastError()，所以需要这些函数。）

**注意**：Windows套接字错误与从errno看到的标准C错误是不同的。

## evutil_make_socket_nonblocking()
~~~c
int evutil_make_socket_nonblocking(evutil_socket_t fd)
~~~
用于对套接字进行非阻塞IO的调用也不能移植到Windows中。<font color="#00b050">evutil_make_socket_nonblocking</font>()函数要求一个套接字（来自socket()或者accept()）作为参数，将其设置为非阻塞的。（设置Unix中的O_NONBLOCK标志和Windows中的<font color="#8064a2">FIONBIO</font>标志）

## evutil_make_listen_socket_reuseable()
~~~c
int evutil_make_listen_socket_reuseable(evutil_socket_t sock)
~~~
这个函数确保关闭监听套接字后，它使用的地址可以立即被另一个套接字使用。（在Unix中它设置<font color="#8064a2">SO_REUSEADDR</font>标志，在Windows中则不做任何操作。不能在Windows中使用<font color="#8064a2">SO_REUSEADDR</font>标志：它有另外不同的含义（译者注：多个套接字绑定到相同地址））

## evutil_make_socket_closeonexec()
~~~c
int evutil_make_socket_closeonexec(evutil_socket_t fd)
~~~

这个函数告诉操作系统，如果调用了exec()，应该关闭指定的套接字。在Unix中函数设置FD_CLOEXEC标志，在Windows上则没有操作。

## evutil_socketpair()
~~~c
int evutil_socketpair(int family, int type, int protocol, evutil_socket_t fd[2])
~~~

### source code
#### evutil_make_socket_nonblocking
~~~c
  

int

evutil_make_socket_nonblocking(evutil_socket_t fd)

{

#ifdef _WIN32

    {

        unsigned long nonblocking = 1;

        if (ioctlsocket(fd, FIONBIO, &nonblocking) == SOCKET_ERROR) {

            event_sock_warn(fd, "fcntl(%d, F_GETFL)", (int)fd);

            return -1;

        }

    }

#else

    {

        int flags;

        if ((flags = fcntl(fd, F_GETFL, NULL)) < 0) {

            event_warn("fcntl(%d, F_GETFL)", fd);

            return -1;

        }

        if (!(flags & O_NONBLOCK)) {

            if (fcntl(fd, F_SETFL, flags | O_NONBLOCK) == -1) {

                event_warn("fcntl(%d, F_SETFL)", fd);

                return -1;

            }

        }

    }

#endif

    return 0;

}
~~~

#### evutil_make_listen_socket_reuseable
~~~c
int

evutil_make_listen_socket_reuseable(evutil_socket_t sock)

{

#if defined(SO_REUSEADDR) && !defined(_WIN32)

    int one = 1;

    /* REUSEADDR on Unix means, "don't hang on to this address after the

     * listener is closed."  On Windows, though, it means "don't keep other

     * processes from binding to this address while we're using it. */

    return setsockopt(sock, SOL_SOCKET, SO_REUSEADDR, (void*) &one,

        (ev_socklen_t)sizeof(one));

#else

    return 0;

#endif

}
~~~

#### evutil_make_socket_closeonexec
~~~c
int

evutil_make_socket_closeonexec(evutil_socket_t fd)

{

#if !defined(_WIN32) && defined(EVENT__HAVE_SETFD)

    int flags;

    if ((flags = fcntl(fd, F_GETFD, NULL)) < 0) {

        event_warn("fcntl(%d, F_GETFD)", fd);

        return -1;

    }

    if (!(flags & FD_CLOEXEC)) {

        if (fcntl(fd, F_SETFD, flags | FD_CLOEXEC) == -1) {

            event_warn("fcntl(%d, F_SETFD)", fd);

            return -1;

        }

    }

#endif

    return 0;

}
~~~


##