本章描述bufferevent的一些对通常使用不必要的高级特征。如果只想学习如何使用bufferevent，可以跳过这一章，直接阅读下一章。

# Paired bufferevent
有时候网络程序需要与自身通信。比如说，通过某些协议对用户连接进行隧道操作的程序，有时候也需要通过同样的协议对自身的连接进行隧道操作。当然，可以通过打开一个到自身监听端口的连接，让程序使用这个连接来达到这种目标。但是，通过网络栈来与自身通信比较浪费资源。

替代的解决方案是，创建一对成对的bufferevent。这样，写入到一个bufferevent的字节都被另一个接收（反过来也是），但是不需要使用套接字。
## bufferevent_pair_new
~~~c
  

int

bufferevent_pair_new(struct event_base *base, int options,

    struct bufferevent *pair[2])

{

    struct bufferevent_pair *bufev1 = NULL, *bufev2 = NULL;

    int tmp_options;

  

    options |= BEV_OPT_DEFER_CALLBACKS;

    tmp_options = options & ~BEV_OPT_THREADSAFE;

  

    bufev1 = bufferevent_pair_elt_new(base, options);

    if (!bufev1)

        return -1;

    bufev2 = bufferevent_pair_elt_new(base, tmp_options);

    if (!bufev2) {

        bufferevent_free(downcast(bufev1));

        return -1;

    }

  

    if (options & BEV_OPT_THREADSAFE) {

        /*XXXX check return */

        bufferevent_enable_locking_(downcast(bufev2), bufev1->bev.lock);

    }

  

    bufev1->partner = bufev2;

    bufev2->partner = bufev1;

  

    evbuffer_freeze(downcast(bufev1)->input, 0);

    evbuffer_freeze(downcast(bufev1)->output, 1);

    evbuffer_freeze(downcast(bufev2)->input, 0);

    evbuffer_freeze(downcast(bufev2)->output, 1);

  

    pair[0] = downcast(bufev1);

    pair[1] = downcast(bufev2);

  

    return 0;

}
~~~

调用bufferevent_pair_new()会设置pair[0]和pair[1]为一对相互连接的bufferevent。除了BEV_OPT_CLOSE_ON_FREE无效、BEV_OPT_DEFER_CALLBACKS总是打开的之外，所有通常的选项都是支持的。

为什么bufferevent对需要带延迟回调运行？通常某一方上的操作会调用一个通知另一方的回调，从而调用另一方的回调，如此这样进行很多步。如果不延迟回调，这种调用链常常会导致栈溢出或者饿死其他连接，而且还要求所有的回调是可重入的。

成对的bufferevent支持flush：设置模式参数为BEV_NORMAL或者BEV_FLUSH会强制要求所有相关数据从对中的一个bufferevent传输到另一个中，而忽略可能会限制传输的水位设置。增加BEV_FINISHED到模式参数中还会让对端的bufferevent产生EOF事件。

释放对中的任何一个成员不会自动释放另一个，也不会产生EOF事件。释放仅仅会使对中的另一个成员成为断开的。bufferevent一旦断开，就不能再成功读写数据或者产生任何事件了。

## bufferevent_pair_get_partner
~~~c
struct bufferevent *

bufferevent_pair_get_partner(struct bufferevent *bev)

{

    struct bufferevent_pair *bev_p;

    struct bufferevent *partner = NULL;

    bev_p = upcast(bev);

    if (! bev_p)

        return NULL;

  

    incref_and_lock(bev);

    if (bev_p->partner)

        partner = downcast(bev_p->partner);

    decref_and_unlock(bev);

    return partner;

}
~~~


有时候在给出了对的一个成员时，需要获取另一个成员，这时候可以使用bufferevent_pair_get_partner()。如果bev是对的成员，而且对的另一个成员仍然存在，函数将返回另一个成员；否则，函数返回NULL。

bufferevent对由2.0.1-alpha版本引入，而bufferevent_pair_get_partner()函数由2.0.6版本引入。
## Filtering bufferevents

有时候需要转换传递给某bufferevent的所有数据，这可以通过添加一个压缩层，或者将协议包装到另一个协议中进行传输来实现。
~~~c
/**

   @name Filtering support

   @{

*/

/**

   Values that filters can return.

 */

enum bufferevent_filter_result {

   /** everything is okay */

   BEV_OK = 0,

   /** the filter needs to read more data before output */

   BEV_NEED_MORE = 1,

   /** the filter encountered a critical error, no further data

       can be processed. */

   BEV_ERROR = 2

};
~~~


~~~c
  

/** A callback function to implement a filter for a bufferevent.

  

    @param src An evbuffer to drain data from.

    @param dst An evbuffer to add data to.

    @param limit A suggested upper bound of bytes to write to dst.

       The filter may ignore this value, but doing so means that

       it will overflow the high-water mark associated with dst.

       -1 means "no limit".

    @param mode Whether we should write data as may be convenient

       (BEV_NORMAL), or flush as much data as we can (BEV_FLUSH),

       or flush as much as we can, possibly including an end-of-stream

       marker (BEV_FINISH).

    @param ctx A user-supplied pointer.

  

    @return BEV_OK if we wrote some data; BEV_NEED_MORE if we can't

       produce any more output until we get some input; and BEV_ERROR

       on an error.

 */

typedef enum bufferevent_filter_result (*bufferevent_filter_cb)(

    struct evbuffer *src, struct evbuffer *dst, ev_ssize_t dst_limit,

    enum bufferevent_flush_mode mode, void *ctx);
~~~

~~~c
/**

   Allocate a new filtering bufferevent on top of an existing bufferevent.
   @param underlying the underlying bufferevent.

   @param input_filter The filter to apply to data we read from the underlying

     bufferevent

   @param output_filter The filer to apply to data we write to the underlying

     bufferevent

   @param options A bitfield of bufferevent options.

   @param free_context A function to use to free the filter context when

     this bufferevent is freed.

   @param ctx A context pointer to pass to the filter functions.

 */

EVENT2_EXPORT_SYMBOL

struct bufferevent *

bufferevent_filter_new(struct bufferevent *underlying,

             bufferevent_filter_cb input_filter,

             bufferevent_filter_cb output_filter,

             int options,

             void (*free_context)(void *),

             void *ctx);

/**@}*/
~~~

bufferevent_filter_new（）函数创建一个封装现有的“底层”bufferevent的过滤bufferevent。所有通过底层bufferevent接收的数据在到达过滤bufferevent之前都会经过“输入”过滤器的转换；所有通过底层bufferevent发送的数据在被发送到底层bufferevent之前都会经过“输出”过滤器的转换。

向底层bufferevent添加过滤器将替换其回调函数。可以向底层bufferevent的evbuffer添加回调函数，但是如果想让过滤器正确工作，就不能再设置bufferevent本身的回调函数。

input_filter和output_filter函数将随后描述。options参数支持所有通常的选项。如果设置了BEV_OPT_CLOSE_ON_FREE，那么释放过滤bufferevent也会同时释放底层bufferevent。ctx参数是传递给过滤函数的任意指针；如果提供了free_context，则在释放ctx之前它会被调用。

底层输入缓冲区有数据可读时，输入过滤器函数会被调用；过滤器的输出缓冲区有新的数据待写入时，输出过滤器函数会被调用。两个过滤器函数都有一对evbuffer参数：从source读取数据；向destination写入数据，而dst_limit参数描述了可以写入destination的字节数上限。过滤器函数可以忽略这个参数，但是这样可能会违背高水位或者速率限制。如果dst_limit是-1，则没有限制。mode参数向过滤器描述了写入的方式。值BEV_NORMAL表示应该在方便转换的基础上写入尽可能多的数据；而BEV_FLUSH表示写入尽可能多的数据；BEV_FINISHED表示过滤器函数应该在流的末尾执行额外的清理操作。最后，过滤器函数的ctx参数就是传递给bufferevent_filter_new（）函数的指针（ctx参数）。

如果成功向目标缓冲区写入了任何数据，过滤器函数应该返回BEV_OK；如果不获得更多的输入，或者不使用不同的清空（flush）模式，就不能向目标缓冲区写入更多的数据，则应该返回BEV_NEED_MORE；如果过滤器上发生了不可恢复的错误，则应该返回BEV_ERROR。

创建过滤器将启用底层bufferevent的读取和写入。随后就不需要自己管理读取和写入了：过滤器在不想读取的时候会自动挂起底层bufferevent的读取。从2.0.8-rc版本开始，可以在过滤器之外独立地启用/禁用底层bufferevent的读取和写入。然而，这样可能会让过滤器不能成功取得所需要的数据。

不需要同时指定输入和输出过滤器：没有给定的过滤器将被一个不进行数据转换的过滤器取代。
## Bufferevent and rate limiting
某些程序需要限制单个或者一组bufferevent使用的带宽。2.0.4-alpha和2.0.5-alpha版本添加了为单个或者一组bufferevent设置速率限制的基本功能。
### Rate Limiting Model
libevent的速率限制使用**记号存储器（token bucket）**算法确定在某时刻可以写入或者读取多少字节。每个速率限制对象在任何给定时刻都有一个<font color="#c0504d">“读存储器（read bucket）”</font>和一个<font color="#c0504d">“**写存储器（write bucket）**”</font>，其大小决定了对象可以立即读取或者写入多少字节。每个存储器有一个填充速率，一个最大突发尺寸，和一个时间单位，或者说“滴答（tick）”。一个时间单位流逝后，存储器被填充一些字节（决定于填充速率）——但是如果超过其突发尺寸，则超出的字节会丢失。

因此，填充速率决定了对象发送或者接收字节的最大平均速率，而突发尺寸决定了在单次突发中可以发送或者接收的最大字节数；时间单位则确定了传输的平滑程度。

## Set rate limit for bufferevent
~~~c

#define EV_RATE_LIMIT_MAX_ EV_SSIZE_MAX
struct ev_token_bucket_cfg;
struct ev_token_bucket_cfg * ev_token_bucket_cfg_new(size_t read_rate, size_t read_burst,
    size_t write_rate, size_t write_burst,const struct timeval *tick_len);

void ev_token_bucket_cfg_free(struct ev_token_bucket_cfg *cfg){
    mm_free(cfg);
}

int bufferevent_set_rate_limit(struct bufferevent *bev,
    struct ev_token_bucket_cfg *cfg);
~~~

ev_token_bucket_cfg结构体代表用于限制单个或者一组bufferevent的一对记号存储器的配置值。要创建ev_token_bucket_cfg，调用ev_token_bucket_cfg_new函数，提供最大平均读取速率、最大突发读取量、最大平均写入速率、最大突发写入量，以及一个滴答的长度。如果tick_len参数为NULL，则默认的滴答长度为一秒。如果发生错误，函数会返回NULL。

注意：read_rate和write_rate参数的单位是字节每滴答。也就是说，如果滴答长度是十分之一秒，read_rate是300，则最大平均读取速率是3000字节每秒。此外，不支持大于EV_RATE_LIMIT_MAX的速率或者突发量。

要限制bufferevent的传输速率，使用一个ev_token_bucket_cfg，对其调用bufferevent_set_rate_limit（）。成功时函数返回0，失败时返回-1。可以对任意数量的bufferevent使用相同的ev_token_bucket_cfg。要移除速率限制，可以调用bufferevent_set_rate_limit（），传递NULL作为cfg参数值。

调用ev_token_bucket_cfg_free（）可以释放ev_token_bucket_cfg。注意：当前在没有任何bufferevent使用ev_token_bucket_cfg之前进行释放是不安全的。

## Set a rate limit for a group of bufferevents
如果要限制一组bufferevent总的带宽使用，可以将它们分配到一个速率限制组中。
~~~c
struct bufferevent_rate_limit_group;

struct bufferevent_rate_limit_group *bufferevent_rate_limit_group_new(struct event_base *base,
    const struct ev_token_bucket_cfg *cfg);

int bufferevent_rate_limit_group_set_cfg(struct bufferevent_rate_limit_group *g,
    const struct ev_token_bucket_cfg *cfg);
void bufferevent_rate_limit_group_free(struct bufferevent_rate_limit_group *g);
  
int bufferevent_add_to_rate_limit_group(struct bufferevent *bev,
    struct bufferevent_rate_limit_group *g);
int bufferevent_remove_from_rate_limit_group(struct bufferevent *bev);   
~~~

要创建速率限制组，使用一个event_base和一个已经初始化的ev_token_bucket_cfg作为参数调用bufferevent_rate_limit_group_new函数。使用bufferevent_add_to_rate_limit_group将bufferevent添加到组中；使用bufferevent_remove_from_rate_limit_group从组中删除bufferevent。这些函数成功时返回0，失败时返回-1。

单个bufferevent在某时刻只能是一个速率限制组的成员。bufferevent可以同时有单独的速率限制（通过bufferevent_set_rate_limit设置）和组速率限制。设置了这两个限制时，对每个bufferevent，较低的限制将被应用。

调用bufferevent_rate_limit_group_set_cfg修改组的速率限制。函数成功时返回0，失败时返回-1。bufferevent_rate_limit_group_free函数释放速率限制组，移除所有成员。

在2.0版本中，组速率限制试图实现总体的公平，但是具体实现可能在小的时间范围内并不公平。如果你强烈关注调度的公平性，请帮助提供未来版本的补丁。

# Check the current rate limit
有时候需要得知应用到给定bufferevent或者组的速率限制，为此，libevent提供了函数：
## bufferevent_get_read_limit bufferevent_get_write_limit bufferevent_rate_limit_group_get_write_limit bufferevent_rate_limit_group_get_read_limit
~~~c
ev_ssize_t bufferevent_get_read_limit(struct bufferevent *bev);
ev_ssize_t bufferevent_get_write_limit(struct bufferevent *bev);
ev_ssize_t bufferevent_rate_limit_group_get_read_limit(struct bufferevent_rate_limit_group *grp);
ev_ssize_t bufferevent_rate_limit_group_get_write_limit(struct bufferevent_rate_limit_group *grp);

~~~

上述函数返回以字节为单位的bufferevent或者组的读写记号存储器大小。注意：如果bufferevent已经被强制超过其配置（清空(flush)操作就会这样），则这些值可能是负数。
## bufferevent_get_max_to_read bufferevent_get_max_to_write

~~~c
ev_ssize_t bufferevent_get_max_to_read(struct bufferevent *bev);
ev_ssize_t bufferevent_get_max_to_write(struct bufferevent *bev);
~~~

这些函数返回在考虑了应用到bufferevent或者组（如果有）的速率限制，以及一次最大读写数据量的情况下，现在可以读或者写的字节数。
## bufferevent_rate_limit_group_get_totals bufferevent_rate_limit_group_reset_totals
~~~c
void bufferevent_rate_limit_group_get_totals(struct bufferevent_rate_limit_group *grp,
	 ev_uint64_t *total_read_out, ev_uint64_t *total_written_out);
void bufferevent_rate_limit_group_reset_totals(struct bufferevent_rate_limit_group *grp);
~~~

每个bufferevent_rate_limit_group跟踪经过其发送的总的字节数，这可用于跟踪组中所有bufferevent总的使用情况。对一个组调用bufferevent_rate_limit_group_get_totals会分别设置total_read_out和total_written_out为组的总读取和写入字节数。组创建的时候这些计数从0开始，调用bufferevent_rate_limit_group_reset_totals会复位计数为0。
# Manually adjust rate limits
对于有复杂需求的程序，可能需要调整记号存储器的当前值。比如说，如果程序不通过使用bufferevent的方式产生一些通信量时。
