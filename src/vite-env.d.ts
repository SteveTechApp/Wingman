/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __APP_BUILD_COMMIT__: string;
declare const __APP_BUILD_NUMBER__: string;
declare const __APP_BUILD_DATE__: string;
declare const __APP_BUILD_CHANNEL__: string;

declare module "mammoth/mammoth.browser" {
  const mammoth: {
    extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string; messages?: unknown[] }>;
  };

  export default mammoth;
  export const extractRawText: typeof mammoth.extractRawText;
}

declare module "pdfjs-dist/legacy/build/pdf.mjs" {
  export const GlobalWorkerOptions: { workerSrc: string };
  export function getDocument(input: {
    data: Uint8Array;
    useWorkerFetch?: boolean;
    isEvalSupported?: boolean;
  }): {
    promise: Promise<{
      numPages: number;
      getPage(pageNumber: number): Promise<{
        getTextContent(): Promise<{ items: Array<{ str?: string }> }>;
      }>;
    }>;
  };
}
