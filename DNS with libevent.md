# DNS with libevent: high-level and low-level functionality

libevent提供了少量用于解析DNS名字的API，以及用于实现简单DNS服务器的机制。
我们从用于名字查询的高层机制开始介绍，然后介绍底层机制和服务器机制。