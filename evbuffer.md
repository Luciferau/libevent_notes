
# Creating and releasing evbuffers
## evbuffer_free  evbuffer_new
~~~c
struct evbuffer * evbuffer_new(void)

{

    struct evbuffer *buffer;

    buffer = mm_calloc(1, sizeof(struct evbuffer));

    if (buffer == NULL)

        return (NULL);

    LIST_INIT(&buffer->callbacks);

    buffer->refcnt = 1;

    buffer->last_with_datap = &buffer->first;
  

    return (buffer);

}
~~~

~~~c
void

evbuffer_free(struct evbuffer *buffer)

{

    EVBUFFER_LOCK(buffer);

    evbuffer_decref_and_unlock_(buffer);

}
~~~

这两个函数的功能很简明：evbuffer_new()分配和返回一个新的空evbuffer；而evbuffer_free()释放evbuffer和其内容。

# evbuffer and thread safety
## evbuffer_enable_locking evbuffer_lock evbuffer_unlock
~~~c
int

evbuffer_enable_locking(struct evbuffer *buf, void *lock)

{

#ifdef EVENT__DISABLE_THREAD_SUPPORT

    return -1;

#else

    if (buf->lock)

        return -1;

  

    if (!lock) {

        EVTHREAD_ALLOC_LOCK(lock, EVTHREAD_LOCKTYPE_RECURSIVE);

        if (!lock)

            return -1;

        buf->lock = lock;

        buf->own_lock = 1;

    } else {

        buf->lock = lock;

        buf->own_lock = 0;

    }

  

    return 0;

#endif

}
~~~

~~~c
void

evbuffer_lock(struct evbuffer *buf)

{

    EVBUFFER_LOCK(buf);

}

  

void

evbuffer_unlock(struct evbuffer *buf)

{

    EVBUFFER_UNLOCK(buf);

}
~~~

默认情况下，在多个线程中同时访问evbuffer是不安全的。如果需要这样的访问，可以调用evbuffer_enable_locking()。如果lock参数为NULL，libevent会使用evthread_set_lock_creation_callback提供的锁创建函数创建一个锁。否则，libevent将lock参数用作锁。

evbuffer_lock()和evbuffer_unlock()函数分别请求和释放evbuffer上的锁。可以使用这两个函数让一系列操作是原子的。如果evbuffer没有启用锁，这两个函数不做任何操作。

（注意：对于单个操作，不需要调用evbuffer_lock()和evbuffer_unlock()：如果evbuffer启用了锁，单个操作就已经是原子的。只有在需要多个操作连续执行，不让其他线程介入的时候，才需要手动锁定evbuffer)

这些函数都在2.0.1-alpha版本中引入。

# Check evbuffer

## evbuffer_get_contiguous_space evbuffer_get_length

~~~c
  
//这个函数返回evbuffer存储的字节数，它在2.0.1-alpha版本中引入。
size_t

evbuffer_get_length(const struct evbuffer *buffer)

{

    size_t result;
    EVBUFFER_LOCK(buffer);
    result = (buffer->total_len);

    EVBUFFER_UNLOCK(buffer);
  
   return result;

}

  
/*这个函数返回连续地存储在evbuffer前面的字节数。evbuffer中的数据可能存储在多个分隔开的内存块中，这个函数返回当前第一个块中的字节数。

这个函数在2.0.1-alpha版本引入*/
size_t

evbuffer_get_contiguous_space(const struct evbuffer *buf)

{

    struct evbuffer_chain *chain;

    size_t result;

  

    EVBUFFER_LOCK(buf);

    chain = buf->first;

    result = (chain != NULL ? chain->off : 0);

    EVBUFFER_UNLOCK(buf);

  

    return result;

}
~~~
- **`evbuffer_get_length`**:
    
    - 这个函数用于获取 `evbuffer` 中数据的总长度。
    - 函数先锁定 `evbuffer`，以确保在访问 `total_len` 时的线程安全，然后解锁并返回长度。
    - 返回的长度由 `evbuffer` 结构中的 `total_len` 字段提供。
- **`evbuffer_get_contiguous_space`**:
    
    - 这个函数用于获取 `evbuffer` 中可用于写入新数据的连续空间的大小。
    - 函数先锁定 `evbuffer`，然后访问 `first` 链，检查 `off` 字段，该字段可能表示连续空间的偏移量或长度。
    - 解锁 `evbuffer` 后返回这个值。

# Adding data to an evbuffer: the basics
## evbuffer_add
~~~c
int evbuffer_add(struct evbuffer *buf, const void *data_in, size_t datlen);
~~~
这个函数添加data处的datalen字节到buf的末尾，成功时返回0，失败时返回-1。
## evbuffer_add_vprintf  evbuffer_add_printf

~~~c
int evbuffer_add_vprintf(struct evbuffer *buf, const char *fmt, va_list ap);
int evbuffer_add_printf(struct evbuffer *buf, const char *fmt, ...);
~~~

这些函数添加格式化的数据到buf末尾。格式参数和其他参数的处理分别与C库函数printf和vprintf相同。函数返回添加的字节数。
## evbuffer_expand
~~~c
int evbuffer_expand(struct evbuffer *buf, size_t datlen)

{

    struct evbuffer_chain *chain;

    EVBUFFER_LOCK(buf);

    chain = evbuffer_expand_singlechain(buf, datlen);

    EVBUFFER_UNLOCK(buf);

    return chain ? 0 : -1;

}
~~~

这个函数修改缓冲区的最后一块，或者添加一个新的块，使得缓冲区足以容纳datlen字节，而不需要更多的内存分配

## example
~~~c
  

int main() {

    evbuffer * buf = evbuffer_new();

    evbuffer_add(buf,"The time is  24.9.17", sizeof("Hello world 24.9.17"));

    //Via printf

    evbuffer_add_printf(buf, "The time is %s", "24.9.17");

}
~~~

evbuffer_add()和evbuffer_add_printf()函数在libevent 0.8版本引入；evbuffer_expand()首次出现在0.9版本，而evbuffer_add_printf()首次出现在1.1版本。

# Move data from one evbuffer to another

为提高效率，libevent具有将数据从一个evbuffer移动到另一个的优化函数。

## evbuffer_add_buffer evbuffer_remove_buffer 

~~~c
int evbuffer_add_buffer(struct evbuffer *outbuf, struct evbuffer *inbuf);

int evbuffer_remove_buffer(struct evbuffer *src, struct evbuffer *dst,size_t datlen)
~~~
evbuffer_add_buffer()将src中的所有数据移动到dst末尾，成功时返回0，失败时返回-1。

evbuffer_remove_buffer()函数从src中移动datlen字节到dst末尾，尽量少进行复制。如果字节数小于datlen，所有字节被移动。函数返回移动的字节数。

evbuffer_add_buffer()在0.8版本引入；evbuffer_remove_buffer()是2.0.1-alpha版本新增加的。
# Add data to the front of the evbuffer
## evbuffer_prepend  evbuffer_prepend_buffer
~~~c
int evbuffer_prepend(struct evbuffer *buf, const void *data, size_t datlen);
int evbuffer_prepend_buffer(struct evbuffer *outbuf, struct evbuffer *inbuf);
~~~

除了将数据移动到目标缓冲区前面之外，这两个函数的行为分别与evbuffer_add()和evbuffer_add_buffer()相同。

使用这些函数时要当心，永远不要对与bufferevent共享的evbuffer使用。这些函数是2.0.1-alpha版本新添加的。

# Rearrange the internal layout of the evbuffer
## evbuffer_pullup
有时候需要取出evbuffer前面的N字节，将其看作连续的字节数组。要做到这一点，首先必须确保缓冲区的前面确实是连续的。
~~~c
unsigned char * evbuffer_pullup(struct evbuffer *buf, ev_ssize_t size)
~~~

evbuffer_pullup()函数“线性化”buf前面的size字节，必要时将进行复制或者移动，以保证这些字节是连续的，占据相同的内存块。如果size是负的，函数会线性化整个缓冲区。如果size大于缓冲区中的字节数，函数返回NULL。否则，evbuffer_pullup()返回指向buf中首字节的指针。

	调用evbuffer_pullup()时使用较大的size参数可能会非常慢，因为这可能需要复制整个缓冲区的内容。
使用evbuffer_get_contiguous_space()返回的值作为尺寸值调用evbuffer_pullup()不会导致任何数据复制或者移动。

evbuffer_pullup()函数由2.0.1-alpha版本新增加：先前版本的libevent总是保证evbuffer中的数据是连续的，而不计开销。
## example 
~~~c
#include <event2/event.h>
#include <event2/buffer.h>
#include <event2/bufferevent.h>
#include <string.h>

int parse_socket4(struct evbuffer * buf,ev_uint64_t * port,ev_uint32_t* addr){
    unsigned char *mem;
    mem = (unsigned char *)evbuffer_pullup(buf, 8);
    if(mem == NULL){

        return -1;

    }

    else if(mem[0]!= 4 || mem[1] != 1){

        return -1;

    }else{

        memcpy(port, mem + 2, 2);

        memcpy(&addr, mem + 4, 4);

        *port = ntohs(*port);

        *addr = ntohl(*addr);

        evbuffer_drain(buf, 8);

        return 1;

    }

}
~~~

# Remove data from the evbuffer
## evbuffer_drain() evbuffer_remove()
~~~c
int evbuffer_drain(struct evbuffer *buf, size_t len);
int evbuffer_remove(struct evbuffer *buf, void *data_out, size_t datlen);
~~~

evbuffer_remove（）函数从buf前面复制和移除datlen字节到data处的内存中。如果可用字节少于datlen，函数复制所有字节。失败时返回-1，否则返回复制了的字节数。

evbuffer_drain（）函数的行为与evbuffer_remove（）相同，只是它不进行数据复制：而只是将数据从缓冲区前面移除。成功时返回0，失败时返回-1。

evbuffer_drain（）由0.8版引入，evbuffer_remove（）首次出现在0.9版。

# Copy data from the evbuffer
## evbuffer_copyout
有时候需要获取缓冲区前面数据的副本，而不清除数据。比如说，可能需要查看某特定类型的记录是否已经完整到达，而不清除任何数据（像evbuffer_remove那样），或者在内部重新排列缓冲区（像evbuffer_pullup那样）。
~~~c
ev_ssize_t evbuffer_copyout(struct evbuffer *buf, void *data_out, size_t datlen){
	return evbuffer_copyout_from(buf, NULL, data_out, datlen);
}
~~~

evbuffer_copyout（）的行为与evbuffer_remove（）相同，但是它不从缓冲区移除任何数据。也就是说，它从buf前面复制datlen字节到data处的内存中。如果可用字节少于datlen，函数会复制所有字节。失败时返回-1，否则返回复制的字节数。

如果从缓冲区复制数据太慢，可以使用<font color="#4bacc6">evbuffer_peek（）</font>。
## example
~~~c
#include <event2/buffer.h>

#include <event2/event.h>

#include <event2/util.h>

  

#include <stdio.h>

#include <stdlib.h>

  

int getr_record(struct evbuffer *buf,size_t *size_out,char** record_out){

  

    size_t bufffer_len = evbuffer_get_length(buf); //获取缓冲区长度

    ev_uint32_t record_len;

    char * record;

    if(bufffer_len <4){

        return 0;

    }

    evbuffer_copyout(buf, &record, 4); //从缓冲区中读取4个字节

    record_len = ntohl(record_len); //将网络字节序转换为主机字节序

    if(bufffer_len < record_len){

        return 0;

    }

    record = (char*)malloc(record_len);

    if(record == NULL){

        return -1;

    }

    evbuffer_drain(buf, record_len); //从缓冲区中移除record_len个字节

    evbuffer_remove(buf, record, record_len); //将record_len个字节从缓冲区中移除并存储到record中

  

    *record_out = record;

    *size_out = record_len;

    return 0;

}
~~~

# Line-oriented input
## enum evbuffer_eol_style
~~~c
/** Used to tell evbuffer_readln what kind of line-ending to look for.

 */

enum evbuffer_eol_style {

  /** Any sequence of CR and LF characters is acceptable as an

   * EOL.

   *

   * Note that this style can produce ambiguous results: the

   * sequence "CRLF" will be treated as a single EOL if it is

   * all in the buffer at once, but if you first read a CR from

   * the network and later read an LF from the network, it will

   * be treated as two EOLs.

   */

  EVBUFFER_EOL_ANY,

  /** An EOL is an LF, optionally preceded by a CR.  This style is

   * most useful for implementing text-based internet protocols. */

  EVBUFFER_EOL_CRLF,

  /** An EOL is a CR followed by an LF. */

  EVBUFFER_EOL_CRLF_STRICT,

  /** An EOL is a LF. */

  EVBUFFER_EOL_LF,

  /** An EOL is a NUL character (that is, a single byte with value 0) */

  EVBUFFER_EOL_NUL

};
~~~
很多互联网协议使用基于行的格式。evbuffer_readln()函数从evbuffer前面取出一行，用一个新分配的空字符结束的字符串返回这一行。如果n_read_out不是NULL，则它被设置为返回的字符串的字节数。如果没有整行供读取，函数返回空。返回的字符串不包括行结束符。

<font color="#4bacc6">evbuffer_readln()</font>理解4种行结束格式：
- **EVBUFFER_EOL_LF**

	行尾是单个换行符（也就是\n，ASCII值是0x0A）

- **EVBUFFER_EOL_CRLF_STRICT**

	行尾是一个回车符，后随一个换行符（也就是\r\n，ASCII值是0x0D 0x0A）

- **EVBUFFER_EOL_CRLF**

	行尾是一个可选的回车，后随一个换行符（也就是说，可以是\r\n或者\n）。这种格式对于解析基于文本的互联网协议很有用，因为标准通常要求\r\n的行结束符，而不遵循标准的客户端有时候只使用\n。

- **EVBUFFER_EOL_ANY**

	行尾是任意数量、任意次序的回车和换行符。这种格式不是特别有用。它的存在主要是为了向后兼容。

（注意，如果使用<font color="#4bacc6">event_se_mem_functions()</font>覆盖默认的malloc，则evbuffer_readln返回的字符串将由你指定的malloc替代函数分配）
## example
~~~c
char * request_line; size_t len;

request_line = evbuffer_readln(buf,&len,EVBUFFER_ELO_CRLF);
if(!request_line){
	/*This first line has not arrived yet.*/
}else{
	if(!strcmp(request_Line,"HTTP/1.0 ",9)){
		/**HTTP 1.0 DETECTED*/
	}
	free(request_line);
}
~~~

evbuffer_readln()接口在1.4.14-stable及以后版本中可用。
# Searching in evbuffer
evbuffer_ptr结构体指示evbuffer中的一个位置，包含可用于在evbuffer中迭代的数据。
~~~c
  
/**

    Pointer to a position within an evbuffer.

    Used when repeatedly searching through a buffer.  Calling any function

    that modifies or re-packs the buffer contents may invalidate all

    evbuffer_ptrs for that buffer.  Do not modify or contruct these values

    except with evbuffer_ptr_set.

  

    An evbuffer_ptr can represent any position from the start of a buffer up

    to a position immediately after the end of a buffer.

  

    @see evbuffer_ptr_set()

 */

struct evbuffer_ptr {

  ev_ssize_t pos;

  

  /* Do not alter or rely on the values of fields: they are for internal

   * use */

  struct {

    void *chain;

    size_t pos_in_chain;

  } internal_;

};
~~~

pos是唯一的公有字段，用户代码不应该使用其他字段。pos指示evbuffer中的一个位置，以到开始处的偏移量表

## evbuffer_search_range evbuffer_search evbuffer_search_eol
~~~c
  
struct evbuffer_ptr evbuffer_search_range(struct evbuffer *buffer, const char *what, size_t len, const struct evbuffer_ptr *start, const struct evbuffer_ptr *end);

struct evbuffer_ptr evbuffer_search(struct evbuffer *buffer, const char *what, size_t len, const struct evbuffer_ptr *start)
{
    return evbuffer_search_range(buffer, what, len, start, NULL);
}


struct evbuffer_ptr evbuffer_search_eol(struct evbuffer *buffer,struct evbuffer_ptr *start, size_t *eol_len_out,enum evbuffer_eol_style eol_style);
~~~

evbuffer_search()函数在缓冲区中查找含有len个字符的字符串what。函数返回包含字符串位置，或者在没有找到字符串时包含-1的evbuffer_ptr结构体。如果提供了start参数，则从指定的位置开始搜索；否则，从开始处进行搜索。

evbuffer_search_range()函数和evbuffer_search行为相同，只是它只考虑在end之前出现的what。

evbuffer_search_eol()函数像evbuffer_readln()一样检测行结束，但是不复制行，而是返回指向行结束符的evbuffer_ptr。如果eol_len_out非空，则它被设置为EOL字符串长度。

~~~c
/**

   Defines how to adjust an evbuffer_ptr by evbuffer_ptr_set()

  

   @see evbuffer_ptr_set() */

enum evbuffer_ptr_how {

  /** Sets the pointer to the position; can be called on with an

      uninitialized evbuffer_ptr. */

  EVBUFFER_PTR_SET,

  /** Advances the pointer by adding to the current position. */

  EVBUFFER_PTR_ADD

};
~~~

~~~c

int evbuffer_ptr_set(struct evbuffer *buf, struct evbuffer_ptr *pos,size_t position, 
					 enum evbuffer_ptr_how how);

~~~

evbuffer_ptr_set函数操作buffer中的位置pos。如果how等于EVBUFFER_PTR_SET,指针被移动到缓冲区中的绝对位置position；如果等于EVBUFFER_PTR_ADD，则向前移动position字节。成功时函数返回0，失败时返回-1。

~~~c
#include <event2/buffer.h>

#include <event2/event.h>

#include <event2/util.h>

#include <string.h>  

int count_instances(struct evbuffer *buf,const char* str) {

    size_t len = strlen(str);

    int total = 0;

  

    struct evbuffer_ptr p ;

    if(!len)

        return -1;

    evbuffer_ptr_set(buf, &p, 0, EVBUFFER_PTR_SET) ;

    while (1)

    {

        p = evbuffer_search(buf, str, len, &p);

        if(p.pos < 0 )

            break;

        total++;

        evbuffer_ptr_set(buf, &p, p.pos + len, EVBUFFER_PTR_SET) ;

    }

    return total;

}
~~~

  **警告**

任何修改evbuffer或者其布局的调用都会使得evbuffer_ptr失效，不能再安全地使用。

这些接口是2.0.1-alpha版本新增加的。

# Detect data without copying
有时候需要读取evbuffer中的数据而不进行复制（像evbuffer_copyout()那样），也不重新排列内部内存布局（像evbuffer_pullup()那样）。有时候可能需要查看evbuffer中间的数据。
## struct iovec | evbuffer_peek()
~~~c
  
#define evbuffer_iovec iovec
/* Structure for scatter/gather I/O.  */

struct evbuffer_iovec
 {

    void *iov_base; /* Pointer to data.  */

    size_t iov_len; /* Length of data.  */

};
~~~

~~~c

int evbuffer_peek(struct evbuffer *buffer, ev_ssize_t len,

    struct evbuffer_ptr *start_at,

    struct evbuffer_iovec *vec, int n_vec);
~~~

调用evbuffer_peek()的时候，通过vec_out给定一个evbuffer_iovec数组，数组的长度是n_vec。函数会让每个结构体包含指向evbuffer内部内存块的指针（iov_base)和块中数据长度。

如果len小于0，evbuffer_peek()会试图填充所有evbuffer_iovec结构体。否则，函数会进行填充，直到使用了所有结构体，或者见到len字节为止。如果函数可以给出所有请求的数据，则返回实际使用的结构体个数；否则，函数返回给出所有请求数据所需的结构体个数。

如果ptr为NULL，函数从缓冲区开始处进行搜索。否则，从ptr处开始搜索。
## example
~~~c
/* Let's look at the first two chunks of buf, and write them to stderr. */
int n, i;
struct evbuffer_iovec v[2];
n = evbuffer_peek(buf, 1, NULL, v, 2);
for (i = 0; i < n; ++i) {
    /* There might be less than two chunks available. */
    fwrite(v[i].iov_base, 1, v[i].iov_len, stderr);
}

/* Let's send the first 4096 bytes to stdout via write. */
int n, i;
struct evbuffer_iovec *v;
size_t written = 0;

/* Determine how many chunks we need. */
n = evbuffer_peek(buf, 4096, NULL, NULL, 0);
/* Allocate space for the chunks. This would be a good time to use malloc if you have it. */
v = malloc(sizeof(struct evbuffer_iovec) * n);

/* Actually fill up v. */
evbuffer_peek(buf, 4096, NULL, v, n);
for (i = 0; i < n; ++i) {
    size_t len = v[i].iov_len;
    if (written + len > 4096) {
        len = 4096 - written;
    }
    ssize_t r = write(1 /* stdout */, v[i].iov_base, len);
    if (r <= 0) break;
    written += len;
}
free(v);

/* Let's get the first 16K of data after the first occurrence of the string "startn", and pass it to a consume() function. */
struct evbuffer_ptr ptr;
struct evbuffer_iovec v1;
const char *s = "startn";
int n_written = 0;

ptr = evbuffer_search(buf, s, strlen(s), NULL);
if (ptr.pos == -1) return; /* no start string found. */

/* Advance the pointer past the start string. */
if (evbuffer_ptr_set(buf, &ptr, strlen(s), EVBUFFER_PTR_ADD) < 0) return; /* off the end of the string. */

while (n_written < 16 * 1024) {
    /* Peek at a single chunk. */
    if (evbuffer_peek(buf, -1, &ptr, v, 1) < 1) break;

    /* Pass the data to some user-defined consume function. */
    consume(v[0].iov_base, v[0].iov_len);
    
    /* Advance the pointer so we see the next chunk next time. */
    if (evbuffer_ptr_set(buf, &ptr, v[0].iov_len, EVBUFFER_PTR_ADD) < 0) break;
}


~~~

 **Attention**

-  修改evbuffer_iovec所指的数据会导致不确定的行为

- 如果任何函数修改了evbuffer，则evbuffer_peek()返回的指针会失效

-  如果在多个线程中使用evbuffer，确保在调用<font color="#4bacc6">evbuffer_peek()</font>之前使用<font color="#4bacc6">evbuffer_lock()</font>，在使用完evbuffer_peek()给出的内容之后进行解锁

这个函数是2.0.2-alpha版本新增加的。
# Add data directly to the evbuffer
## evbuffer_reserve_space evbuffer_commit_space
有时候需要能够直接向<font color="#4bacc6">evbuffer</font>添加数据，而不用先将数据写入到字符数组中，然后再使用<font color="#4bacc6">evbuffer_add()</font>进行复制。有一对高级函数可以完成这种功能：<font color="#4bacc6">evbuffer_reserve_space()</font>和<font color="#4bacc6">evbuffer_commit_space()</font>。跟<font color="#4bacc6">evbuffer_peek()</font>一样，这两个函数使用evbuffer_iovec结构体来提供对evbuffer内部内存的直接访问。

~~~c
int evbuffer_reserve_space(struct evbuffer *buf, ssize_t size, struct iovec *vec, int n_vec);

int evbuffer_commit_space(struct evbuffer *buf, struct iovec *vec, int n_vecs);
 
~~~
evbuffer_reserve_space()函数给出evbuffer内部空间的指针。函数会扩展缓冲区以至少提供size字节的空间。到扩展空间的指针，以及其长度，会存储在通过vec传递的向量数组中，n_vec是数组的长度。

n_vec的值必须至少是1。如果只提供一个向量，libevent会确保请求的所有连续空间都在单个扩展区中，但是这可能要求重新排列缓冲区，或者浪费内存。为取得更好的性能，应该至少提供2个向量。函数返回提供请求的空间所需的向量数。

写入到向量中的数据不会是缓冲区的一部分，直到调用evbuffer_commit_space()，使得写入的数据进入缓冲区。如果需要提交少于请求的空间，可以减小任何evbuffer_iovec结构体的iov_len字段，也可以提供较少的向量。函数成功时返回0，失败时返回-1。

**提示和警告**
- 调用任何重新排列evbuffer或者向其添加数据的函数都将使从evbuffer_reserve_space()获取的指针失效。

- 当前实现中，不论用户提供多少个向量，evbuffer_reserve_space()从不使用多于两个。未来版本可能会改变这一点。

- 如果在多个线程中使用evbuffer，确保在调用evbuffer_reserve_space()之前使用evbuffer_lock()进行锁定，然后在提交后解除锁定。

## Good example
~~~c
#include <event2/buffer.h>

struct evbuffer *buf;
struct evbuffer_iovec v[2];
int n, i;
size_t n_to_add = 2048;

/* Reserve 2048 bytes in the buffer */
n = evbuffer_reserve_space(buf, n_to_add, v, 2);
if (n <= 0) {
    /* Unable to reserve the space for some reason */
    return;
}

for (i = 0; i < n && n_to_add > 0; ++i) {
    size_t len = v[i].iov_len;

    /* Don't write more than the required number of bytes */
    if (len > n_to_add) {
        len = n_to_add;
    }

    /* Generate data into the reserved space */
    if (generate_data(v[i].iov_base, len) < 0) {
        /* If there was an error during data generation, stop here. No data is committed to the buffer */
        return;
    }

    /* Set iov_len to the number of bytes we actually wrote */
    v[i].iov_len = len;
    n_to_add -= len;
}

/* Commit the space to the buffer */
if (evbuffer_commit_space(buf, v, i) < 0) {
    /* Error committing */
    return;
}

~~~


## Bad example
~~~c
struct evbuffer_iovec v[2];
evbuffer_reserve_space(buf, 1024, v, 2);
evbuffer_add(buf, "x", 1);

/* 错误：在调用 evbuffer_add() 后，缓冲区的内部结构可能已发生变化 */
memset(v[0].iov_base, 'y', v[0].iov_len - 1); // 可能导致崩溃！
evbuffer_commit_space(buf, v, 1);

~~~

~~~c
struct evbuffer_iovec v[2];
evbuffer_reserve_space(buf, 1024, v, 2);

/* 填充保留的空间 */
memset(v[0].iov_base, 'y', v[0].iov_len - 1);

/* 提交保留的空间 */
evbuffer_commit_space(buf, v, 1);

/* 现在可以安全地添加更多数据 */
evbuffer_add(buf, "x", 1);
~~~
---


~~~c
const char *data = "Here is some data";
evbuffer_reserve_space(buf, strlen(data), v, 1);

/* 错误：你不能直接将 v[0].iov_base 指向外部数据 */
v[0].iov_base = (char *)data; // 危险！
v[0].iov_len = strlen(data);

/* 提交空间可能会失败或产生意外行为 */
evbuffer_commit_space(buf, v, 1);

~~~

~~~c
const char *data = "Here is some data";
evbuffer_reserve_space(buf, strlen(data), v, 1);

/* 将 'data' 的内容复制到保留的空间中 */
memcpy(v[0].iov_base, data, strlen(data));
v[0].iov_len = strlen(data);

/* 提交保留的空间 */
evbuffer_commit_space(buf, v, 1);
~~~
# Network IO using evbuffers
## evbuffer_write evbuffer_write_atmost evbuffer_read
libevent中evbuffer的最常见使用场合是网络IO。将evbuffer用于网络IO的接口是：
~~~c
int evbuffer_write(struct evbuffer *buffer, int fd);
int evbuffer_write_atmost(struct evbuffer *buffer, int fd, ssize_t howmuch);
int evbuffer_read(struct evbuffer *buffer, int fd, int howmuch);
~~~
<font color="#4bacc6">evbuffer_read()</font>函数从套接字fd读取至多howmuch字节到buffer末尾。成功时函数返回读取的字节数，0表示EOF，失败时返回-1。注意，错误码可能指示非阻塞操作不能立即成功，应该检查错误码EAGAIN（或者Windows中的<font color="#8064a2">WSAWOULDBLOCK</font>）。如果<font color="#4bacc6">howmuch</font>为负，<font color="#4bacc6">evbuffer_read()</font>试图猜测要读取多少数据。

<font color="#4bacc6">evbuffer_write_atmost()</font>函数试图将<font color="#4bacc6">buffer</font>前面至多<font color="#4bacc6">howmuch</font>字节写入到套接字fd中。成功时函数返回写入的字节数，失败时返回-1。跟evbuffer_read()一样，应该检查错误码，看是真的错误，还是仅仅指示非阻塞IO不能立即完成。如果为<font color="#4bacc6">howmuch</font>给出负值，函数会试图写入buffer的所有内容。

调用evbuffer_write()与使用负的howmuch参数调用evbuffer_write_atmost()一样：函数会试图尽量清空buffer的内容。

在Unix中，这些函数应该可以在任何支持read和write的文件描述符上正确工作。在Windows中，仅仅支持套接字。

注意，如果使用bufferevent，则不需要调用这些函数，bufferevent的代码已经为你调用了。

evbuffer_write_atmost()函数在2.0.1-alpha版本中引入。

# evbuffer and callback
evbuffer的用户常常需要知道什么时候向evbuffer添加了数据，什么时候移除了数据。为支持这个.
libevent为evbuffer提高了通用回调机制。
## struct evbuffer_cb_info
~~~c

/** Structure passed to an evbuffer_cb_func evbuffer callback
    @see evbuffer_cb_func, evbuffer_add_cb()
 */

struct evbuffer_cb_info {

  /** The number of bytes in this evbuffer when callbacks were last
   * invoked. */
	  /** 最后一次调用回调时此 evbuffer 中的字节数。
  */

  size_t orig_size;

  /** The number of bytes added since callbacks were last invoked. */

  size_t n_added;

  /** The number of bytes removed since callbacks were last invoked. */

  size_t n_deleted;

};
~~~

向evbuffer添加数据，或者从中移除数据的时候，回调函数会被调用。函数收到<font color="#4bacc6">缓冲区指针</font>、一个<font color="#4bacc6">evbuffer_cb_info</font>结构体指针，和用户提供的参数。evbuffer_cb_info结构体的orig_size字段指示缓冲区改变大小前的字节数，n_added字段指示向缓冲区添加了多少字节；n_deleted字段指示移除了多少字节。
## struct evbuffer_cb_entry | evbuffer_add_cb()

~~~c
/** A single evbuffer callback for an evbuffer. This function will be invoked

 * when bytes are added to or removed from the evbuffer. */

struct evbuffer_cb_entry {

    /** Structures to implement a doubly-linked queue of callbacks */

    LIST_ENTRY(evbuffer_cb_entry) next;

    /** The callback function to invoke when this callback is called.

        If EVBUFFER_CB_OBSOLETE is set in flags, the cb_obsolete field is

        valid; otherwise, cb_func is valid. */

    union {

        evbuffer_cb_func cb_func;

        evbuffer_cb cb_obsolete;

    } cb;

    /** Argument to pass to cb. */

    void *cbarg;

    /** Currently set flags on this callback. */

    ev_uint32_t flags;

};
~~~

~~~c
struct evbuffer_cb_entry * 
evbuffer_add_cb(struct evbuffer *buf, evbuffer_cb cb, void *arg, size_t datalen, evbuffer_cb_flags flags);
~~~

evbuffer_add_cb()函数为evbuffer添加一个回调函数，返回一个不透明的指针，随后可用于代表这个特定的回调实例。cb参数是将被调用的函数，cbarg是用户提供的将传给这个函数的指针。

可以为单个evbuffer设置多个回调，添加新的回调不会移除原来的回调。

## example
~~~c
#include <event2/buffer.h>
#include <stdio.h>
#include <stdlib.h>

/**Here is a callback that remembers how many bytes we have drained in total from the buffer,and prints a dot every time we hit a megabyte*/
  
struct total_processed{

    size_t n;

};

void count_megabytes(struct evbuffer* buffer,

    const struct evbuffer_cb_info * info,void *args)

{

    struct total_processed * tp = (struct total_processed *)args;

    size_t old_n = tp->n;

    int megabytes,i ;

    tp->n += info->n_deleted;

    megabytes = (tp->n >> 20)-(old_n >> 20);

    for(i = 0; i < megabytes; ++i) {

        putc('.',stdout);

    }

}

void operation_with_counted_bytes(){

    struct total_processed *tp = malloc(sizeof(tp));
    struct evbuffer * buf = evbuffer_new();
    tp->n = 0;
    evbuffer_add_cb(buf,count_megabytes_cb,tp);
    /*Use the evbuffer for a while ,When we 're done:*/
    evbuffer_free(buf);
    free(tp);

}
~~~

注意：释放非空evbuffer不会清空其数据，释放evbuffer也不会为回调释放用户提供的数据指针。

如果不想让缓冲区上的回调永远激活，可以移除或者禁用回调：

## evbuffer_remove_cb evbuffer_remove_cb_entry evbuffer_cb_set_flags evbuffer_cb_clear_flags
~~~c
int evbuffer_remove_cb(struct evbuffer *buffer, evbuffer_cb_func cb, void *cbarg);
int evbuffer_remove_cb_entry(struct evbuffer *buffer, struct evbuffer_cb_entry *ent);

#define EVBUFFER_REMOVE_CB_ENABLED 1
int evbuffer_cb_set_flags(struct evbuffer *buffer, 
								struct evbuffer_cb_entry *cb, 
								uint32_t flags);
int evbuffer_cb_clear_flags(struct evbuffer *buffer, 
								struct evbuffer_cb_entry *cb,
								 uint32_t flags);
~~~

可以通过添加回调时候的<font color="#4bacc6">evbuffer_cb_entry</font>来移除回调，也可以通过回调函数和参数指针来移除。成功时函数返回0，失败时返回-1。

<font color="#4bacc6">evbuffer_cb_set_flags()</font>和evbuffer_cb_clear_flags()函数分别为回调函数设置或者清除给定的标志。当前只有一个标志是用户可见的：EVBUFFER_CB_ENABLED。这个标志默认是打开的。如果清除这个标志，对evbuffer的修改不会调用回调函数。

## evbuffer_defer_callbacks（）
~~~c
int evbuffer_defer_callbacks(struct evbuffer *buffer, struct event_base *base);
~~~
跟bufferevent回调一样，可以让evbuffer回调不在evbuffer被修改时立即运行，而是延迟到某event_base的事件循环中执行。如果有多个evbuffer，它们的回调潜在地让数据添加到evbuffer中，或者从中移除，又要避免栈崩溃，延迟回调是很有用的。

如果回调被延迟，则最终执行时，它可能是多个操作结果的总和。

与bufferevent一样，evbuffer具有内部引用计数的，所以即使还有未执行的延迟回调，释放evbuffer也是安全的。

整个回调系统是2.0.1-alpha版本新引入的。evbuffer_cb_(set|clear)_flags()函数从2.0.2-alpha版本开始存在。

# Avoiding data copying for evbuffer-based IO

真正高速的网络编程通常要求尽量少的数据复制，libevent为此提供了一些机制：
![Avoiding data copying for evbuffer-based IO](images/Pasted%20image%2020240923224952.png)

~~~c
int evbuffer_add_reference(struct evbuffer *outbuf,
						   const void *data, size_t datlen, 
						   evbuffer_ref_cleanup_cb cleanupfn, 
						   void *cleanupfn_arg);
~~~