import { runVisionContextAnalysis, type VisionContextResult } from "../api/wingmanApi";

export type VisualAttachmentKind = "room_photo" | "schematic_diagram" | "unclear";

export type VisualAttachmentAnalysis = {
  id: string;
  fileName: string;
  kind: VisualAttachmentKind;
  summary: string;
  roomObservations: string[];
  visibleEquipment: string[];
  layoutNotes: string[];
  confidence: number;
  analyzedAt: string;
};

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.72;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read image file "${file.name}".`));
    };
    image.src = url;
  });
}

export async function downscaleImageToBase64(file: File): Promise<{ base64Data: string; mimeType: string }> {
  const image = await loadImage(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context is unavailable for image processing.");
  ctx.drawImage(image, 0, 0, width, height);

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  const base64Data = dataUrl.split(",")[1] ?? "";
  return { base64Data, mimeType: "image/jpeg" };
}

export function isSupportedVisualAttachment(file: File): boolean {
  return file.type.startsWith("image/");
}

export async function analyzeVisualAttachment(file: File, hint = ""): Promise<VisualAttachmentAnalysis> {
  const { base64Data, mimeType } = await downscaleImageToBase64(file);

  const response = await runVisionContextAnalysis({
    fileName: file.name,
    mimeType,
    base64Data,
    hint,
  });

  return normalizeVisionContextResult(file.name, response.data);
}

function normalizeVisionContextResult(fileName: string, result: VisionContextResult | undefined): VisualAttachmentAnalysis {
  const kind: VisualAttachmentKind =
    result?.attachmentKind === "room_photo" || result?.attachmentKind === "schematic_diagram"
      ? result.attachmentKind
      : "unclear";

  return {
    id: `${fileName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fileName,
    kind,
    summary: result?.summary?.trim() || "No visual summary was returned for this attachment.",
    roomObservations: (result?.roomObservations ?? []).filter(Boolean),
    visibleEquipment: (result?.visibleEquipment ?? []).filter(Boolean),
    layoutNotes: (result?.layoutNotes ?? []).filter(Boolean),
    confidence: typeof result?.confidence === "number" ? result.confidence : 0,
    analyzedAt: new Date().toISOString(),
  };
}
