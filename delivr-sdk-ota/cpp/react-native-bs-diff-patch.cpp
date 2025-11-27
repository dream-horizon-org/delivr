
extern "C" {
  #include "bsdiff.h"
  #include "bspatch.h"
}

namespace bsdiffpatch {

  int diffFile(const char* oldFile, const char* newFile, const char* patchFile) {
    return bsDiffFile(oldFile, newFile, patchFile);
  }

  int patchFile(const char* oldFile, const char* newFile, const char* patchFile) {
    return bsPatchFile(oldFile, newFile, patchFile);
  }
}
