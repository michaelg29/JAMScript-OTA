
all: rsa_encrypt

CFLAGS=-g -lssl -lcrypto

%.o: %.c
	gcc -c $< $(CFLAGS)

ijamreg: ijamreg.o
	gcc ijamreg.o $(CFLAGS) -o a.o

run:
	exec ./a.o

debug:
	gdb ./a.o

clean:
	$(RM) *.o
