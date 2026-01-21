#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// Function declarations
int main_bsdiff(int argc, char *argv[]);
int main_bspatch(int argc, char *argv[]);

int main(int argc, char *argv[]) {
    if (argc < 2) {
        fprintf(stderr, "Usage:\n");
        fprintf(stderr, "  %s diff oldfile newfile patchfile compression\n", argv[0]);
        fprintf(stderr, "  %s patch oldfile newfile patchfile\n", argv[0]);
        return 1;
    }

    if (strcmp(argv[1], "diff") == 0) {
        if (argc != 6) {  // Program name + diff + 3 files + compression
            fprintf(stderr, "Usage: %s diff oldfile newfile patchfile compression\n", argv[0]);
            return 1;
        }
        // Shift arguments to match main_bsdiff expectations
        argv[1] = argv[0];
        return main_bsdiff(argc - 1, argv + 1);
    } else if (strcmp(argv[1], "patch") == 0) {
        if (argc != 6) {  // Program name + patch + 3 files + compression
            fprintf(stderr, "Usage: %s patch oldfile newfile patchfile isPatchCompressed\n", argv[0]);
            return 1;
        }
        // Shift arguments to match main_bspatch expectations
        argv[1] = argv[0];
        return main_bspatch(argc - 1, argv + 1);
    } else {
        fprintf(stderr, "Unknown command: %s\n", argv[1]);
        return 1;
    }
}
