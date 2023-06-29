
all: rsa_encrypt

CFLAGS=-g -lssl -lcrypto

%.o: %.c
	gcc -c $< $(CFLAGS)

ijamreg: ijamreg.o ijam_util.o
	gcc ijamreg.o ijam_util.o $(CFLAGS) -o a.o

ijamonline: ijamonline.o ijam_util.o
	gcc ijamonline.o ijam_util.o $(CFLAGS) -o a.o

run:
	exec ./a.o

debug:
	gdb ./a.o

clean:
	$(RM) *.o
