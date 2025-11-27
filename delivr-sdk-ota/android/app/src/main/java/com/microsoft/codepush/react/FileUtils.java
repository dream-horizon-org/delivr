package com.microsoft.codepush.react;

import org.brotli.dec.BrotliInputStream;

import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

public class FileUtils {

    private static final int WRITE_BUFFER_SIZE = 1024 * 8;

    public static void copyDirectoryContents(String sourceDirectoryPath, String destinationDirectoryPath) throws IOException {
        try {
            File sourceDir = new File(sourceDirectoryPath);
            File destDir = new File(destinationDirectoryPath);
            if (!destDir.exists()) {
                destDir.mkdir();
            }

            for (File sourceFile : sourceDir.listFiles()) {
                if (sourceFile.isDirectory()) {
                    copyDirectoryContents(
                            CodePushUtils.appendPathComponent(sourceDirectoryPath, sourceFile.getName()),
                            CodePushUtils.appendPathComponent(destinationDirectoryPath, sourceFile.getName()));
                } else {
                    File destFile = new File(destDir, sourceFile.getName());
                    FileInputStream fromFileStream = null;
                    BufferedInputStream fromBufferedStream = null;
                    FileOutputStream destStream = null;
                    byte[] buffer = new byte[WRITE_BUFFER_SIZE];
                    try {
                        fromFileStream = new FileInputStream(sourceFile);
                        fromBufferedStream = new BufferedInputStream(fromFileStream);
                        destStream = new FileOutputStream(destFile);
                        int bytesRead;
                        while ((bytesRead = fromBufferedStream.read(buffer)) > 0) {
                            destStream.write(buffer, 0, bytesRead);
                        }
                    } finally {
                        try {
                            if (fromFileStream != null) fromFileStream.close();
                            if (fromBufferedStream != null) fromBufferedStream.close();
                            if (destStream != null) destStream.close();
                        } catch (IOException e) {
                            throw new CodePushUnknownException("Error closing IO resources.", e);
                        }
                    }
                }
            }
        } catch (Exception e){
            e.printStackTrace();
            CodePushUtils.log("sourceDirectoryPath or destinationDirectoryPath might be null " + e.toString());
        }

    }

    public static void deleteDirectoryAtPath(String directoryPath) {
        if (directoryPath == null) {
            CodePushUtils.log("deleteDirectoryAtPath attempted with null directoryPath");
            return;
        }
        File file = new File(directoryPath);
        if (file.exists()) {
            deleteFileOrFolderSilently(file);
        }
    }

    public static void deleteFileAtPathSilently(String path) {
        deleteFileOrFolderSilently(new File(path));
    }

    public static void deleteFileOrFolderSilently(File file) {
        if (file.isDirectory()) {
            File[] files = file.listFiles();
            for (File fileEntry : files) {
                if (fileEntry.isDirectory()) {
                    deleteFileOrFolderSilently(fileEntry);
                } else {
                    fileEntry.delete();
                }
            }
        }

        if (!file.delete()) {
            CodePushUtils.log("Error deleting file " + file.getName());
        }
    }

    public static boolean fileAtPathExists(String filePath) {
        return new File(filePath).exists();
    }

    public static void moveFile(File fileToMove, String newFolderPath, String newFileName) {
        File newFolder = new File(newFolderPath);
        if (!newFolder.exists()) {
            newFolder.mkdirs();
        }

        File newFilePath = new File(newFolderPath, newFileName);
        if (!fileToMove.renameTo(newFilePath)) {
            throw new CodePushUnknownException("Unable to move file from " +
                    fileToMove.getAbsolutePath() + " to " + newFilePath.getAbsolutePath() + ".");
        }
    }

    public static String readFileToString(String filePath) throws IOException {
        FileInputStream fin = null;
        BufferedReader reader = null;
        try {
            File fl = new File(filePath);
            fin = new FileInputStream(fl);
            reader = new BufferedReader(new InputStreamReader(fin));
            StringBuilder sb = new StringBuilder();
            String line = null;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append("\n");
            }

            return sb.toString();
        } finally {
            if (reader != null) reader.close();
            if (fin != null) fin.close();
        }
    }

    private static String validateFileName(String fileName, File destinationFolder) throws IOException {
        String destinationFolderCanonicalPath = destinationFolder.getCanonicalPath() + File.separator;

        File file = new File(destinationFolderCanonicalPath, fileName);
        String canonicalPath = file.getCanonicalPath();

        if (!canonicalPath.startsWith(destinationFolderCanonicalPath)) {
            throw new IllegalStateException("File is outside extraction target directory.");
        }

        return canonicalPath;
    }

    public static CodePushCompressionMode unzipFile(File zipFile, String destination) throws IOException {
        FileInputStream fileStream = null;
        BufferedInputStream bufferedStream = null;
        ZipInputStream zipStream = null;
        CodePushCompressionMode compressionMode = CodePushCompressionMode.DEFAULT;
        try {
            fileStream = new FileInputStream(zipFile);
            bufferedStream = new BufferedInputStream(fileStream);
            zipStream = new ZipInputStream(bufferedStream);
            ZipEntry entry;

            File destinationFolder = new File(destination);
            if (destinationFolder.exists()) {
                deleteFileOrFolderSilently(destinationFolder);
            }

            destinationFolder.mkdirs();
            byte[] buffer = new byte[WRITE_BUFFER_SIZE];
            while ((entry = zipStream.getNextEntry()) != null) {
                if (entry.getName().endsWith(".br")) {
                    compressionMode = CodePushCompressionMode.BROTLI;
                }
                String fileName = validateFileName(entry.getName(), destinationFolder);
                File file = new File(fileName);
                if (entry.isDirectory()) {
                    file.mkdirs();
                } else {
                    File parent = file.getParentFile();
                    if (!parent.exists()) {
                        parent.mkdirs();
                    }

                    FileOutputStream fout = new FileOutputStream(file);
                    try {
                        int numBytesRead;
                        while ((numBytesRead = zipStream.read(buffer)) != -1) {
                            fout.write(buffer, 0, numBytesRead);
                        }
                    } finally {
                        fout.close();
                    }
                }
                long time = entry.getTime();
                if (time > 0) {
                    file.setLastModified(time);
                }
            }
        } finally {
            try {
                if (zipStream != null) zipStream.close();
                if (bufferedStream != null) bufferedStream.close();
                if (fileStream != null) fileStream.close();
            } catch (IOException e) {
                throw new CodePushUnknownException("Error closing IO resources.", e);
            }
        }
        return compressionMode;
    }

    public static void writeStringToFile(String content, String filePath) throws IOException {
        PrintWriter out = null;
        try {
            out = new PrintWriter(filePath);
            out.print(content);
        } finally {
            if (out != null) out.close();
        }
    }

    public static void decompressFiles(String unzippedFolderPath, String decompressedFolderPath) throws IOException {
        File unzippedFolder = new File(unzippedFolderPath);
        File decompressedFolder = new File(decompressedFolderPath);
        
        if (!decompressedFolder.exists()) {
            decompressedFolder.mkdirs();
        }
        
        decompressFilesRecursive(unzippedFolder, decompressedFolder);
    }

    private static void decompressFilesRecursive(File sourceDir, File targetDir) throws IOException {
        File[] files = sourceDir.listFiles();
        if (files == null) return;

        for (File sourceFile : files) {
            File targetFile = new File(targetDir, sourceFile.getName());
            
            if (sourceFile.isDirectory()) {
                // Create corresponding directory in target and recurse
                targetFile.mkdirs();
                decompressFilesRecursive(sourceFile, targetFile);
            } else {
                if (sourceFile.getName().endsWith(".br")) {
                    // For .br files, decompress them
                    String decompressedName = sourceFile.getName().substring(0, sourceFile.getName().length() - 3);
                    File decompressedFile = new File(targetDir, decompressedName);
                    try {
                        decompressFile(sourceFile, decompressedFile);
                    } catch (IOException e) {
                       CodePushUtils.log("Failed to decompress " + sourceFile.getName() + ": " + e.getMessage());
                        throw new CodePushUnknownException("Failed to decompress " + sourceFile.getName() + ": " + e.getMessage());
                    }
                } else {
                    // For non-.br files, just copy them        
                    copyFile(sourceFile, targetFile);
                }
            }
        }
    }

    private static void decompressFile(File sourceFile, File targetFile) throws IOException {
        try (FileInputStream fileInputStream = new FileInputStream(sourceFile);
             BrotliInputStream brotliInputStream = new BrotliInputStream(fileInputStream);
             FileOutputStream fileOutputStream = new FileOutputStream(targetFile)) {
            
            byte[] buffer = new byte[8192];
            int bytesRead;
            while ((bytesRead = brotliInputStream.read(buffer)) != -1) {
                fileOutputStream.write(buffer, 0, bytesRead);
            }
        }
    }

    private static void copyFile(File sourceFile, File targetFile) throws IOException {
        try (FileInputStream in = new FileInputStream(sourceFile);
             FileOutputStream out = new FileOutputStream(targetFile)) {
            byte[] buffer = new byte[8192];
            int bytesRead;
            while ((bytesRead = in.read(buffer)) != -1) {
                out.write(buffer, 0, bytesRead);
            }
        }
    }
}