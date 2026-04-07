import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export interface ExtractedFile {
  text: string;
  filename: string;
  mimeType: string;
  wordCount: number;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Map([
  ["application/pdf", "pdf"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
  ["text/plain", "txt"],
  ["text/markdown", "md"],
  ["text/csv", "csv"],
]);

export function isAllowedFileType(mimeType: string): boolean {
  return ALLOWED_TYPES.has(mimeType);
}

export function getAllowedExtensions(): string[] {
  return [...ALLOWED_TYPES.values()];
}

export async function extractTextFromFile(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<ExtractedFile> {
  if (!isAllowedFileType(mimeType)) {
    throw new Error(`Unsupported file type: ${mimeType}. Allowed: ${getAllowedExtensions().join(", ")}`);
  }

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024} MB.`);
  }

  let text: string;

  switch (mimeType) {
    case "application/pdf":
      text = await extractFromPDF(buffer);
      break;
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      text = await extractFromDOCX(buffer);
      break;
    case "text/plain":
    case "text/markdown":
    case "text/csv":
      text = buffer.toString("utf-8");
      break;
    default:
      throw new Error(`No extractor for type: ${mimeType}`);
  }

  // Clean extracted text
  text = text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\n{4,}/g, "\n\n\n")
    .replace(/ {4,}/g, "   ")
    .trim();

  if (text.length < 50) {
    throw new Error("Could not extract enough text from the file. It may be image-based or encrypted.");
  }

  // Enforce max char limit
  if (text.length > 50000) {
    text = text.slice(0, 50000);
  }

  return {
    text,
    filename,
    mimeType,
    wordCount: text.split(/\s+/).length,
  };
}

async function extractFromPDF(buffer: Buffer): Promise<string> {
  try {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    // getText returns pages, join them
    return result.pages.map((p) => p.text).join("\n");
  } catch {
    throw new Error("Failed to parse PDF. The file may be corrupted or password-protected.");
  }
}

async function extractFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch {
    throw new Error("Failed to parse DOCX. The file may be corrupted.");
  }
}
