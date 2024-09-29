The reactor sofftware design pattern is an event handing strategy that can respond to many potential service requests concurrently.

The component is an event loop,runing in a single thread or process,which [demultiplexes](https://en.wikipedia.org/wiki/Demultiplex) incoming requests  and dispatches them to the correct request handler.[[1]](https://en.wikipedia.org/wiki/Reactor_pattern#cite_note-Schmidt_1995-1)

By relying on event-based mechanisms rather than [blocking I/O](https://en.wikipedia.org/wiki/Blocking_I/O "Blocking I/O") or multi-threading, a reactor can handle many concurrent [I/O bound](https://en.wikipedia.org/wiki/I/O_bound "I/O bound") requests with minimal delay.[[2]](https://en.wikipedia.org/wiki/Reactor_pattern#cite_note-Devresse_2014-2) A reactor also allows for easily modifying or expanding specific request handler routines, though the pattern does have some drawbacks and limitations.[[1]](https://en.wikipedia.org/wiki/Reactor_pattern#cite_note-Schmidt_1995-1)

With its balance of simplicity and [scalability](https://en.wikipedia.org/wiki/Scalability "Scalability"), the reactor has become a central architectural element in several [server](https://en.wikipedia.org/wiki/Server_(computing) "Server (computing)") applications and [software frameworks](https://en.wikipedia.org/wiki/Software_framework "Software framework") for [networking](https://en.wikipedia.org/wiki/Computer_network "Computer network"). Derivations such as the **multireactor** and [proactor](https://en.wikipedia.org/wiki/Proactor_pattern "Proactor pattern") also exist for special cases where even greater throughput, performance, or request complexity are necessary.[[1]](https://en.wikipedia.org/wiki/Reactor_pattern#cite_note-Schmidt_1995-1)[[2]](https://en.wikipedia.org/wiki/Reactor_pattern#cite_note-Devresse_2014-2)[[3]](https://en.wikipedia.org/wiki/Reactor_pattern#cite_note-Escoffier_2021-3)[[4]](https://en.wikipedia.org/wiki/Reactor_pattern#cite_note-Garrett_2015-4)

# Overview



