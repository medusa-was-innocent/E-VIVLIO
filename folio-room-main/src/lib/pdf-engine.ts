import type { PDFDocumentProxy } from "pdfjs-dist";
import { copyToBuffer } from "@/lib/doc";

let configured = false;

export async function openPdfDocument(data: Uint8Array): Promise<PDFDocumentProxy> {
  const pdfjs = await import("pdfjs-dist");
  if (!configured) {
    pdfjs.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdfjs/pdf.worker.min.mjs`;
    configured = true;
  }
  return pdfjs.getDocument({
    data: copyToBuffer(data),
    cMapUrl: `${import.meta.env.BASE_URL}pdfjs/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${import.meta.env.BASE_URL}pdfjs/standard_fonts/`,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;
}
