# DNS with libevent: high-level and low-level functionality

libevent提供了少量用于解析DNS名字的API，以及用于实现简单DNS服务器的机制。
我们从用于名字查询的高层机制开始介绍，然后介绍底层机制和服务器机制。

# Portable blocking name resolution
为移植已经使用阻塞式名字解析的程序，libevent提供了标准getaddrinfo()接口的可移植实现。对于需要运行在没有getaddrinfo(）函数，或者getaddrinfo()不像我们的替代函数那样遵循标准的平台上的程序，这个替代实现很有用。

getaddrinfo()接口由RFC  定义。关于libevent如何不满足其一致性实现的概述，请看下面的“兼容性提示”节。

~~~c
~~~