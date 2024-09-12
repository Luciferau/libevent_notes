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