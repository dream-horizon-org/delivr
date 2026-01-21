cmake_minimum_required(VERSION 3.4.1)
project(BsDiffPatch)

set (CMAKE_VERBOSE_MAKEFILE ON)
set (CMAKE_CXX_STANDARD 11)

file(GLOB_RECURSE SOURCES "../../cpp/*.c" "../../cpp/*.cpp" "../../cpp/bzlib/*.c" "../../cpp/bzlib/*.cpp")

add_library(react-native-bs-diff-patch            SHARED
            ${SOURCES}
            cpp-adapter.cpp
)

# Specifies a path to native header files.
include_directories(
            ../../cpp
            ../../cpp/bzlib
            cpp-adapter.cpp
)
set_target_properties(react-native-bs-diff-patch PROPERTIES
    LINK_FLAGS "-Wl,-z,max-page-size=16384"
)
