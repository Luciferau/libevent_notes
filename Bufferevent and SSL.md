bufferevent可以使用OpenSSL库实现SSL/TLS安全传输层。因为很多应用不需要或者不想链接OpenSSL，这部分功能在单独的libevent_openssl库中实现。未来版本的libevent可能会添加其他SSL/TLS库，如NSS或者GnuTLS，但是当前只有OpenSSL。
OpenSSL功能在2.0.3-alpha版本引入，然而直到2.0.5-beta和2.0.6-rc版本才能良好工作。

这一节不包含对OpenSSL、SSL/TLS或者密码学的概述。
这一节描述的函数都在<font color="#4bacc6">event2/bufferevent_ssl.h</font>中声明。
