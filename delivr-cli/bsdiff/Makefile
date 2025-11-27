CC=gcc
CFLAGS=-O3 -Wall
LDFLAGS=-lbz2

all: bsdiff43

bsdiff43: main.c bsdiff_main.c bspatch_main.c
	$(CC) $(CFLAGS) -o bsdiff43 main.c bsdiff_main.c bspatch_main.c $(LDFLAGS)

clean:
	rm -f bsdiff43
