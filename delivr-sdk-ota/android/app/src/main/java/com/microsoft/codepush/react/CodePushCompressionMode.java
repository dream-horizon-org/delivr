package com.microsoft.codepush.react;

public enum CodePushCompressionMode {
    DEFAULT(0),
    BROTLI(1);

    private final int value;
    CodePushCompressionMode(int value) {
        this.value = value;
    }
    public int getValue() {
        return this.value;
    }
}
