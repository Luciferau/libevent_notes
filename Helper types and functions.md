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


# Standard integer types

落后于21世纪的C系统常常没有实现C99标准规定的stdint.h头文件。考虑到这种情况，
libevent定义了来自于stdint.h的、位宽度确定（bit-width-specific）的整数类型：


| Type        | Width | Signed | Maximum       | Minimum      |
| ----------- | ----- | ------ | ------------- | ------------ |
| ev_uint64_t | 64    | No     | EV_UINT64_MAX | 0            |
| ev_int64_t  | 64    | Yes    | EV_INT64_MAX  | EV_INT64_MIN |
| ev_uint32_t | 32    | No     | EV_UINT32_MAX | 0            |
| ev_int32_t  | 32    | Yes    | EV_INT32_MAX  | EV_INT32_MIN |
| ev_uint16_t | 16    | No     | EV_UINT16_MAX | 0            |
| ev_int16_t  | 16    | Yes    | EV_INT16_MAX  | EV_INT16_MIN |
| ev_uint8_t  | 8     | No     | EV_UINT8_MAX  | 0            |
| ev_int8_t   | 8     | Yes    | EV_INT8_MAX   | EV_INT8_MIN  |
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
