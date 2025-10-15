/*-
 * Copyright 2003-2005 Colin Percival
 * Copyright 2012 Matthew Endsley
 * All rights reserved
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted providing that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
 * OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
 * STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING
 * IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

#include <limits.h>
#include "bspatch.h"
#include <stdbool.h>

static int64_t offtin(uint8_t *buf)
{
	int64_t y;

	y=buf[7]&0x7F;
	y=y*256;y+=buf[6];
	y=y*256;y+=buf[5];
	y=y*256;y+=buf[4];
	y=y*256;y+=buf[3];
	y=y*256;y+=buf[2];
	y=y*256;y+=buf[1];
	y=y*256;y+=buf[0];

	if(buf[7]&0x80) y=-y;

	return y;
}

int bspatch(const uint8_t* oldbuf, int64_t oldsize, uint8_t* newbuf, int64_t newsize, struct bspatch_stream* stream)
{
	uint8_t buf[8];
	int64_t oldpos,newpos;
	int64_t ctrl[3];
	int64_t i;

	oldpos=0;newpos=0;
	while(newpos<newsize) {
		/* Read control data */
		for(i=0;i<=2;i++) {
			if (stream->read(stream, buf, 8))
				return -1;
			ctrl[i]=offtin(buf);
		};

		/* Sanity-check */
		if (ctrl[0]<0 || ctrl[0]>INT_MAX ||
			ctrl[1]<0 || ctrl[1]>INT_MAX ||
			newpos+ctrl[0]>newsize)
			return -1;

		/* Read diff string */
		if (stream->read(stream, newbuf + newpos, ctrl[0]))
			return -1;

		/* Add old data to diff string */
		for(i=0;i<ctrl[0];i++)
			if((oldpos+i>=0) && (oldpos+i<oldsize))
				newbuf[newpos+i]+=oldbuf[oldpos+i];

		/* Adjust pointers */
		newpos+=ctrl[0];
		oldpos+=ctrl[0];

		/* Sanity-check */
		if(newpos+ctrl[1]>newsize)
			return -1;

		/* Read extra string */
		if (stream->read(stream, newbuf + newpos, ctrl[1]))
			return -1;

		/* Adjust pointers */
		newpos+=ctrl[1];
		oldpos+=ctrl[2];
	};

	return 0;
}

static int bz2_read(const struct bspatch_stream* stream, void* buffer, int length)
{
    int n;
    int bz2err;
    BZFILE* bz2;

    bz2 = (BZFILE*)stream->opaque;
    n = BZ2_bzRead(&bz2err, bz2, buffer, length);
    if (n != length)
        return -1;

    return 0;
}

static int raw_read(const struct bspatch_stream* stream, void* buffer, int length)
{
	FILE* f = (FILE*)stream->opaque;
	return fread(buffer, 1, length, f) == length ? 0 : -1;
}

static off_t readFileToBuffer(int fd, uint8_t* buffer, off_t bufferSize)
{
    off_t bytesRead = 0;
    int ret;
    while (bytesRead < bufferSize)
    {
        ret = read(fd, buffer + bytesRead, bufferSize - bytesRead);
        if (ret > 0)
        {
            bytesRead += ret;
        }
        else
        {
            break;
        }
    }
    return bytesRead;
}

static off_t writeFileFromBuffer(int fd, uint8_t* buffer, off_t bufferSize)
{
    off_t bytesWritten = 0;
    int ret;
    while (bytesWritten < bufferSize)
    {
        ret = write(fd, buffer + bytesWritten, bufferSize - bytesWritten);
        if (ret > 0)
        {
            bytesWritten += ret;
        }
        else
        {
            break;
        }
    }
    return bytesWritten;
}

int bsPatchFile(const char* oldFile, const char* newFile, const char* patchFile)
{
  FILE * f;
  int fd;
  int bz2err;
  uint8_t header[24];
  uint8_t *old, *new;
  int64_t oldsize, newsize;
  BZFILE* bz2;
  struct bspatch_stream stream;
  struct stat sb;
  bool useBz2 = false;
  /* Open patch file */
  if ((f = fopen(patchFile, "r")) == NULL) {
      printf ("Cannot open file %s \n", patchFile);
      err(1, "fopen(%s)", patchFile);
  }

  /* Read header */
  if (fread(header, 1, 24, f) != 24) {
      if (feof(f)) {
          printf ("Corrupt patch %s \n", patchFile);
          errx(1, "Corrupt patch\n");
      }
      err(1, "fread(%s)", patchFile);
  }

  /* Check for appropriate magic */
  if (memcmp(header, "ENDSLEY/BSDIFF43", 16) != 0) {
      errx(1, "Corrupt patch\n");
  }

  /* Read lengths from header */
  newsize=offtin(header+16);
  if(newsize<0) {
      errx(1,"Corrupt patch\n");
  }

  /* Close patch file and re-open it via libbzip2 at the right places */
  if(((fd=open(oldFile,O_RDONLY,0))<0) ||
      ((oldsize=lseek(fd,0,SEEK_END))==-1) ||
      ((old=malloc(oldsize+1))==NULL) ||
      (lseek(fd,0,SEEK_SET)!=0) ||
      (readFileToBuffer(fd,old,oldsize)!=oldsize) ||
      (fstat(fd, &sb)) ||
      (close(fd)==-1)) err(1,"%s", oldFile);
  if((new=malloc(newsize+1))==NULL) err(1,NULL);
  if (useBz2) {
    if (NULL == (bz2 = BZ2_bzReadOpen(&bz2err, f, 0, 0, NULL, 0)))
        errx(1, "BZ2_bzReadOpen, bz2err=%d", bz2err);
    stream.read = bz2_read;
    stream.opaque = bz2;
} else {
    // For raw read, we need to seek back to after the header
    if (fseek(f, 24, SEEK_SET) != 0)
        err(1, "fseek");
    stream.read = raw_read;
    stream.opaque = f;
}
  if (bspatch(old, oldsize, new, newsize, &stream)) {
      errx(1, "bspatch");
  }

  /* Clean up the bzip2 reads */
  	/* Clean up the reads */
    if (useBz2) {
		BZ2_bzReadClose(&bz2err, bz2);
	}
  fclose(f);

  /* Write the new file */
  if(((fd=open(newFile,O_CREAT|O_TRUNC|O_WRONLY,0666))<0) ||
      (writeFileFromBuffer(fd,new,newsize)!=newsize) || (close(fd)==-1)) {
      err(1,"%s",newFile);
  }
  free(new);
  free(old);
  return 0;
}
