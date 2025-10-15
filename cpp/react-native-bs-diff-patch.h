#ifndef BSDIFFPATCH_H
#define BSDIFFPATCH_H

namespace bsdiffpatch {
  int diffFile(const char* oldFile, const char* newFile, const char* patchFile);
  int patchFile(const char* oldFile, const char* newFile, const char* patchFile);
}

#endif /* BSDIFFPATCH_H */
