import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";
import { extractDocumentText, extractDocuments, ExtractedDocument } from "@/wingman2/lib/documentExtract";

/**
 * Creates a mock File object for testing.
 * Since File is a browser API, we mock it with the essential properties and methods.
 */
function createMockFile(
  name: string,
  content: string,
  options: { type?: string; throwOnText?: boolean; throwOnArrayBuffer?: boolean } = {}
): File {
  const blob = new Blob([content], { type: options.type || "text/plain" });

  const file = {
    name,
    size: content.length,
    type: options.type || "text/plain",
    lastModified: Date.now(),
    text: options.throwOnText
      ? vi.fn().mockRejectedValue(new Error("Failed to read file"))
      : vi.fn().mockResolvedValue(content),
    arrayBuffer: options.throwOnArrayBuffer
      ? vi.fn().mockRejectedValue(new Error("Failed to read array buffer"))
      : vi.fn().mockResolvedValue(new TextEncoder().encode(content).buffer),
    slice: vi.fn(),
    stream: vi.fn(),
  } as unknown as File;

  return file;
}

describe("extractDocumentText", () => {
  describe("Text file extraction", () => {
    it("should extract text from .txt files", async () => {
      const content = "Hello, this is a text file.";
      const file = createMockFile("document.txt", content);

      const result = await extractDocumentText(file);

      expect(result.fileName).toBe("document.txt");
      expect(result.text).toBe(content);
      expect(result.warnings).toHaveLength(0);
    });

    it("should extract text from .md files", async () => {
      const content = "# Markdown Header\n\nSome paragraph text.";
      const file = createMockFile("readme.md", content);

      const result = await extractDocumentText(file);

      expect(result.fileName).toBe("readme.md");
      expect(result.text).toBe(content);
      expect(result.warnings).toHaveLength(0);
    });

    it("should extract text from .csv files", async () => {
      const content = "name,age,city\nJohn,30,NYC\nJane,25,LA";
      const file = createMockFile("data.csv", content);

      const result = await extractDocumentText(file);

      expect(result.fileName).toBe("data.csv");
      expect(result.text).toBe(content);
      expect(result.warnings).toHaveLength(0);
    });

    it("should extract text from .rtf files", async () => {
      const content = "Rich text format content";
      const file = createMockFile("document.rtf", content);

      const result = await extractDocumentText(file);

      expect(result.fileName).toBe("document.rtf");
      expect(result.text).toBe(content);
      expect(result.warnings).toHaveLength(0);
    });

    it("should extract text from .eml files", async () => {
      const content = "From: sender@example.com\nTo: recipient@example.com\nSubject: Test\n\nEmail body";
      const file = createMockFile("email.eml", content);

      const result = await extractDocumentText(file);

      expect(result.fileName).toBe("email.eml");
      expect(result.text).toBe(content);
      expect(result.warnings).toHaveLength(0);
    });

    it("should handle case-insensitive file extensions", async () => {
      const content = "Uppercase extension";
      const file = createMockFile("document.TXT", content);

      const result = await extractDocumentText(file);

      expect(result.text).toBe(content);
      expect(result.warnings).toHaveLength(0);
    });

    it("should handle mixed case extensions", async () => {
      const content = "Mixed case extension";
      const file = createMockFile("document.Md", content);

      const result = await extractDocumentText(file);

      expect(result.text).toBe(content);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe("Edge cases - Empty files", () => {
    it("should handle empty text file", async () => {
      const file = createMockFile("empty.txt", "");

      const result = await extractDocumentText(file);

      expect(result.fileName).toBe("empty.txt");
      expect(result.text).toBe("");
      expect(result.warnings).toHaveLength(0);
    });

    it("should handle file with only whitespace", async () => {
      const content = "   \n\t\n   ";
      const file = createMockFile("whitespace.txt", content);

      const result = await extractDocumentText(file);

      expect(result.text).toBe(content);
      expect(result.warnings).toHaveLength(0);
    });

    it("should handle file with only newlines", async () => {
      const content = "\n\n\n\n";
      const file = createMockFile("newlines.txt", content);

      const result = await extractDocumentText(file);

      expect(result.text).toBe(content);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe("Edge cases - Large files", () => {
    it("should handle large text files", async () => {
      // Create content of approximately 1MB
      const largeContent = "x".repeat(1024 * 1024);
      const file = createMockFile("large.txt", largeContent);

      const result = await extractDocumentText(file);

      expect(result.fileName).toBe("large.txt");
      expect(result.text).toBe(largeContent);
      expect(result.text.length).toBe(1024 * 1024);
      expect(result.warnings).toHaveLength(0);
    });

    it("should handle files with many lines", async () => {
      const manyLines = Array(10000).fill("Line of text").join("\n");
      const file = createMockFile("manylines.txt", manyLines);

      const result = await extractDocumentText(file);

      expect(result.text).toBe(manyLines);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe("Edge cases - Special characters", () => {
    it("should handle Unicode content", async () => {
      const content = "Hello 世界 🌍 АБВ";
      const file = createMockFile("unicode.txt", content);

      const result = await extractDocumentText(file);

      expect(result.text).toBe(content);
      expect(result.warnings).toHaveLength(0);
    });

    it("should handle special characters in filename", async () => {
      const content = "content";
      const file = createMockFile("file with spaces (1).txt", content);

      const result = await extractDocumentText(file);

      expect(result.fileName).toBe("file with spaces (1).txt");
      expect(result.text).toBe(content);
    });

    it("should handle emoji in content", async () => {
      const content = "Hello 👋 World 🌎";
      const file = createMockFile("emoji.txt", content);

      const result = await extractDocumentText(file);

      expect(result.text).toBe(content);
    });
  });

  describe("Error handling for unsupported files", () => {
    it("should return warning for unsupported file extensions", async () => {
      const file = createMockFile("image.png", "binary data");

      const result = await extractDocumentText(file);

      expect(result.fileName).toBe("image.png");
      expect(result.text).toBe("");
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("not a supported ingest format");
    });

    it("should return specific warning for legacy .doc files", async () => {
      const file = createMockFile("legacy.doc", "binary data");

      const result = await extractDocumentText(file);

      expect(result.fileName).toBe("legacy.doc");
      expect(result.text).toBe("");
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("Legacy .doc files are not supported");
      expect(result.warnings[0]).toContain("Convert to DOCX or PDF");
    });

    it("should handle .exe files as unsupported", async () => {
      const file = createMockFile("program.exe", "binary");

      const result = await extractDocumentText(file);

      expect(result.text).toBe("");
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("not a supported ingest format");
    });

    it("should handle files without extension", async () => {
      const file = createMockFile("noextension", "some content");

      const result = await extractDocumentText(file);

      expect(result.text).toBe("");
      expect(result.warnings).toHaveLength(1);
    });

    it("should handle image files as unsupported", async () => {
      const imageTypes = ["jpg", "jpeg", "gif", "bmp", "webp"];

      for (const ext of imageTypes) {
        const file = createMockFile(`image.${ext}`, "binary");
        const result = await extractDocumentText(file);

        expect(result.text).toBe("");
        expect(result.warnings.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Error handling - Read failures", () => {
    it("should handle file.text() throwing an error", async () => {
      const file = createMockFile("broken.txt", "content", { throwOnText: true });

      const result = await extractDocumentText(file);

      expect(result.fileName).toBe("broken.txt");
      expect(result.text).toBe("");
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("could not be extracted");
      expect(result.warnings[0]).toContain("Failed to read file");
    });

    it("should handle error without message property", async () => {
      const file = createMockFile("test.txt", "content");
      // Override text to throw a non-Error object
      (file.text as Mock).mockRejectedValue("string error");

      const result = await extractDocumentText(file);

      expect(result.text).toBe("");
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("unknown parser error");
    });
  });

  describe("Return type structure", () => {
    it("should always return ExtractedDocument shape", async () => {
      const file = createMockFile("test.txt", "content");

      const result = await extractDocumentText(file);

      expect(result).toHaveProperty("fileName");
      expect(result).toHaveProperty("text");
      expect(result).toHaveProperty("warnings");
      expect(typeof result.fileName).toBe("string");
      expect(typeof result.text).toBe("string");
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it("should return ExtractedDocument for unsupported files", async () => {
      const file = createMockFile("test.xyz", "content");

      const result = await extractDocumentText(file);

      expect(result).toHaveProperty("fileName");
      expect(result).toHaveProperty("text");
      expect(result).toHaveProperty("warnings");
    });

    it("should return ExtractedDocument on error", async () => {
      const file = createMockFile("test.txt", "content", { throwOnText: true });

      const result = await extractDocumentText(file);

      expect(result).toHaveProperty("fileName");
      expect(result).toHaveProperty("text");
      expect(result).toHaveProperty("warnings");
    });
  });
});

describe("extractDocuments", () => {
  it("should extract multiple files in parallel", async () => {
    const files = [
      createMockFile("file1.txt", "Content 1"),
      createMockFile("file2.txt", "Content 2"),
      createMockFile("file3.txt", "Content 3"),
    ];

    const results = await extractDocuments(files);

    expect(results).toHaveLength(3);
    expect(results[0].text).toBe("Content 1");
    expect(results[1].text).toBe("Content 2");
    expect(results[2].text).toBe("Content 3");
  });

  it("should handle empty array", async () => {
    const results = await extractDocuments([]);

    expect(results).toHaveLength(0);
    expect(Array.isArray(results)).toBe(true);
  });

  it("should handle mixed file types", async () => {
    const files = [
      createMockFile("supported.txt", "Text content"),
      createMockFile("unsupported.xyz", "Unknown format"),
      createMockFile("also-supported.md", "# Markdown"),
    ];

    const results = await extractDocuments(files);

    expect(results).toHaveLength(3);
    expect(results[0].text).toBe("Text content");
    expect(results[0].warnings).toHaveLength(0);
    expect(results[1].text).toBe("");
    expect(results[1].warnings.length).toBeGreaterThan(0);
    expect(results[2].text).toBe("# Markdown");
    expect(results[2].warnings).toHaveLength(0);
  });

  it("should handle single file in array", async () => {
    const files = [createMockFile("single.txt", "Only one file")];

    const results = await extractDocuments(files);

    expect(results).toHaveLength(1);
    expect(results[0].text).toBe("Only one file");
  });

  it("should preserve file order in results", async () => {
    const files = [
      createMockFile("a.txt", "A"),
      createMockFile("b.txt", "B"),
      createMockFile("c.txt", "C"),
    ];

    const results = await extractDocuments(files);

    expect(results[0].fileName).toBe("a.txt");
    expect(results[1].fileName).toBe("b.txt");
    expect(results[2].fileName).toBe("c.txt");
  });

  it("should not fail entirely if one file fails", async () => {
    const files = [
      createMockFile("good1.txt", "Good 1"),
      createMockFile("bad.txt", "Bad", { throwOnText: true }),
      createMockFile("good2.txt", "Good 2"),
    ];

    const results = await extractDocuments(files);

    expect(results).toHaveLength(3);
    expect(results[0].text).toBe("Good 1");
    expect(results[1].text).toBe("");
    expect(results[1].warnings.length).toBeGreaterThan(0);
    expect(results[2].text).toBe("Good 2");
  });

  it("should handle large number of files", async () => {
    const files = Array.from({ length: 100 }, (_, i) =>
      createMockFile(`file${i}.txt`, `Content ${i}`)
    );

    const results = await extractDocuments(files);

    expect(results).toHaveLength(100);
    results.forEach((result, i) => {
      expect(result.fileName).toBe(`file${i}.txt`);
      expect(result.text).toBe(`Content ${i}`);
    });
  });
});

describe("File extension patterns", () => {
  const supportedTextExtensions = ["txt", "rtf", "md", "csv", "eml"];

  supportedTextExtensions.forEach((ext) => {
    it(`should recognize .${ext} as a supported text format`, async () => {
      const file = createMockFile(`test.${ext}`, "content");
      const result = await extractDocumentText(file);

      expect(result.text).toBe("content");
      expect(result.warnings).toHaveLength(0);
    });

    it(`should recognize .${ext.toUpperCase()} as a supported text format`, async () => {
      const file = createMockFile(`test.${ext.toUpperCase()}`, "content");
      const result = await extractDocumentText(file);

      expect(result.text).toBe("content");
      expect(result.warnings).toHaveLength(0);
    });
  });

  it("should recognize .docx extension (but extraction requires mammoth)", async () => {
    // The .docx pattern is recognized, but actual extraction would fail
    // without the mammoth library properly mocked
    const file = createMockFile("test.docx", "binary content", { throwOnArrayBuffer: true });
    const result = await extractDocumentText(file);

    // Should attempt extraction and fail gracefully
    expect(result.fileName).toBe("test.docx");
  });

  it("should recognize .pdf extension (but extraction requires pdfjs)", async () => {
    // The .pdf pattern is recognized, but actual extraction would fail
    // without pdfjs-dist properly mocked
    const file = createMockFile("test.pdf", "binary content", { throwOnArrayBuffer: true });
    const result = await extractDocumentText(file);

    // Should attempt extraction and fail gracefully
    expect(result.fileName).toBe("test.pdf");
  });
});
