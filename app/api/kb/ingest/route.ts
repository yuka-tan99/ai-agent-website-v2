import { NextRequest, NextResponse } from "next/server";
import { Buffer } from "node:buffer";
import { inflateRawSync, inflateSync } from "node:zlib";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type IngestResult = {
  documentId: string;
  chunksInserted: number;
};

const MAX_FILE_BYTES =
  Number(process.env.KB_MAX_FILE_BYTES ?? 8 * 1024 * 1024);
const CHUNK_WORDS = Number(process.env.KB_CHUNK_WORDS ?? 260);
const CHUNK_OVERLAP = Number(process.env.KB_CHUNK_OVERLAP ?? 40);
const MAX_CHUNKS = Number(process.env.KB_MAX_CHUNKS ?? 120);
const EMBEDDING_MODEL =
  process.env.KB_EMBED_MODEL ?? "text-embedding-004";
const GEMINI_API_KEY =
  process.env.GOOGLE_API_KEY ??
  process.env.GEMINI_API_KEY ??
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
  "";

const embedClient = GEMINI_API_KEY
  ? new GoogleGenerativeAI(GEMINI_API_KEY).getGenerativeModel({
      model: EMBEDDING_MODEL,
    })
  : null;

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!embedClient) {
    return NextResponse.json(
      { error: "Embedding model is not configured" },
      { status: 500 },
    );
  }

  const formData = await req.formData();
  const fileEntry = formData.get("file");
  const rawTitle = formData.get("title");
  const rawSource = formData.get("source");

  if (!(fileEntry instanceof File)) {
    return NextResponse.json(
      { error: "Expected 'file' field with a document upload" },
      { status: 400 },
    );
  }

  if (fileEntry.size === 0) {
    return NextResponse.json(
      { error: "Uploaded file is empty" },
      { status: 400 },
    );
  }

  if (fileEntry.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      {
        error: `File is too large (${fileEntry.size} bytes). Max allowed is ${MAX_FILE_BYTES} bytes`,
      },
      { status: 413 },
    );
  }

  const title =
    typeof rawTitle === "string" && rawTitle.trim().length
      ? rawTitle.trim()
      : null;
  if (!title) {
    return NextResponse.json(
      { error: "Missing 'title' value" },
      { status: 400 },
    );
  }

  const source =
    typeof rawSource === "string" && rawSource.trim().length
      ? rawSource.trim()
      : null;

  const buffer = await fileToBuffer(fileEntry);
  const text = extractText(fileEntry.name ?? "", fileEntry.type ?? "", buffer);

  if (!text) {
    return NextResponse.json(
      {
        error:
          "Unable to extract text from document. Only PDF and UTF-8 text files are supported.",
      },
      { status: 415 },
    );
  }

  const normalized = normalizeWhitespace(text);
  if (!normalized) {
    return NextResponse.json(
      {
        error:
          "Document did not contain extractable text after processing.",
      },
      { status: 422 },
    );
  }

  const chunks = buildChunks(normalized);

  if (!chunks.length) {
    return NextResponse.json(
      { error: "Document could not be chunked" },
      { status: 422 },
    );
  }

  if (chunks.length > MAX_CHUNKS) {
    return NextResponse.json(
      {
        error: `Document produced ${chunks.length} chunks which exceeds the limit of ${MAX_CHUNKS}. Try uploading a shorter document or adjust chunking configuration.`,
      },
      { status: 422 },
    );
  }

  const embeddings = await embedChunks(chunks);
  const ingestResult = await storeInSupabase({
    title,
    source,
    chunks,
    embeddings,
  });

  return NextResponse.json<IngestResult>(ingestResult, { status: 200 });
}

async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function extractText(name: string, mime: string, data: Buffer): string {
  if (
    mime === "application/pdf" ||
    name.toLowerCase().endsWith(".pdf")
  ) {
    try {
      return extractFromPdf(data);
    } catch (error) {
      console.warn("[kb/ingest] PDF extraction failed", error);
      return "";
    }
  }

  if (
    mime.startsWith("text/") ||
    name.toLowerCase().endsWith(".txt") ||
    name.toLowerCase().endsWith(".md")
  ) {
    return data.toString("utf8");
  }

  return "";
}

function extractFromPdf(buffer: Buffer): string {
  const textSegments: string[] = [];
  const raw = buffer.toString("latin1");
  const streamRegex = /stream([\s\S]*?)endstream/g;

  let streamMatch: RegExpExecArray | null;
  while ((streamMatch = streamRegex.exec(raw)) !== null) {
    const [, streamBody] = streamMatch;
    const cleaned = streamBody
      .replace(/^\s*?\r?\n/, "")
      .replace(/\r?\n\s*$/, "");
    const streamBuffer = Buffer.from(cleaned, "latin1");
    const decoded = decodePdfStream(streamBuffer);
    if (decoded) {
      const extracted = extractPdfStrings(decoded);
      if (extracted) {
        textSegments.push(extracted);
      }
    }
  }

  if (!textSegments.length) {
    textSegments.push(extractPdfStrings(raw));
  }

  return textSegments
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("\n");
}

function decodePdfStream(data: Buffer): string | null {
  const attempts = [
    () => inflateRawSync(data),
    () => inflateSync(data),
    () => data,
  ];

  for (const attempt of attempts) {
    try {
      const output = attempt();
      if (Buffer.isBuffer(output)) {
        const text = output.toString("utf8");
        if (text.trim().length > 0) {
          return text;
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}

function extractPdfStrings(content: string): string {
  const pieces: string[] = [];
  const parenRegex = /\(([^()]*)\)/g;
  let match: RegExpExecArray | null;

  while ((match = parenRegex.exec(content)) !== null) {
    const value = unescapePdfString(match[1]);
    if (value.trim().length) {
      pieces.push(value);
    }
  }

  const hexRegex = /<([0-9A-Fa-f\s]+)>/g;
  while ((match = hexRegex.exec(content)) !== null) {
    const hex = match[1].replace(/\s+/g, "");
    if (hex.length % 2 === 0 && hex.length >= 8) {
      try {
        const buf = Buffer.from(hex, "hex");
        const value = buf.toString("utf8").trim();
        if (value.length) {
          pieces.push(value);
        }
      } catch {
        // ignore malformed hex
      }
    }
  }

  if (!pieces.length) {
    const fallback = content.replace(/[^\x09\x0A\x0D\x20-\x7E]+/g, " ");
    pieces.push(fallback);
  }

  return pieces.join("\n");
}

function unescapePdfString(input: string): string {
  return input
    .replace(/\\([nrtbf()\\])/g, (_, group: string) => {
      switch (group) {
        case "n":
          return "\n";
        case "r":
          return "\r";
        case "t":
          return "\t";
        case "b":
          return "\b";
        case "f":
          return "\f";
        case "(":
          return "(";
        case ")":
          return ")";
        case "\\":
          return "\\";
        default:
          return group;
      }
    })
    .replace(/\\([0-7]{1,3})/g, (_, octal: string) => {
      const code = parseInt(octal, 8);
      if (Number.isFinite(code) && code >= 0 && code <= 255) {
        return String.fromCharCode(code);
      }
      return "";
    });
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\r\n/g, "\n").trim().replace(/\s+/g, " ");
}

function buildChunks(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const chunks: string[] = [];
  const maxWords = Math.max(50, CHUNK_WORDS);
  const overlap = Math.min(Math.max(0, CHUNK_OVERLAP), maxWords - 10);

  let index = 0;
  while (index < words.length && chunks.length < MAX_CHUNKS) {
    const end = Math.min(words.length, index + maxWords);
    const slice = words.slice(index, end);
    if (slice.length) {
      chunks.push(slice.join(" "));
    }
    if (end >= words.length) {
      break;
    }
    index = end - overlap;
    if (index <= 0) {
      index = end;
    }
  }

  return chunks;
}

async function embedChunks(chunks: string[]): Promise<number[][]> {
  const outputs: number[][] = [];
  for (const chunk of chunks) {
    const response = await embedClient!.embedContent({
      content: {
        role: "user",
        parts: [{ text: chunk }],
      },
    });
    const vector = response.embedding?.values ?? [];
    if (!vector.length) {
      throw new Error("Embedding response missing values");
    }
    outputs.push([...vector]);
  }
  return outputs;
}

async function storeInSupabase({
  title,
  source,
  chunks,
  embeddings,
}: {
  title: string;
  source: string | null;
  chunks: string[];
  embeddings: number[][];
}): Promise<IngestResult> {
  if (chunks.length !== embeddings.length) {
    throw new Error("Embedding count mismatch");
  }

  const admin = supabaseAdmin();

  let docQuery = admin.from("kb_documents").select("id").eq("title", title);
  docQuery = source
    ? docQuery.eq("source", source)
    : docQuery.is("source", null);

  const { data: existing, error: existingError } = await docQuery.maybeSingle();

  if (existingError) {
    throw existingError;
  }

  let documentId = existing?.id as string | undefined;

  if (documentId) {
    const { error: deleteError } = await admin
      .from("kb_chunks")
      .delete()
      .eq("document_id", documentId);
    if (deleteError) {
      throw deleteError;
    }
  } else {
    const { data: inserted, error: insertError } = await admin
      .from("kb_documents")
      .insert([{ title, source }])
      .select("id")
      .single();

    if (insertError) {
      throw insertError;
    }

    documentId = inserted.id as string;
  }

  const rows = chunks.map((content, index) => ({
    document_id: documentId,
    chunk_idx: index,
    content,
    embedding: embeddings[index],
  }));

  const { error: chunkError } = await admin.from("kb_chunks").insert(rows);
  if (chunkError) {
    throw chunkError;
  }

  return {
    documentId,
    chunksInserted: rows.length,
  };
}
