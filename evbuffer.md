
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

struct iovec
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
{
	/**Let's look at the first two chunks of buf ,and write them to stderr */
	int n ,i;
	struct evbuffer_iovec 
}

~~~
