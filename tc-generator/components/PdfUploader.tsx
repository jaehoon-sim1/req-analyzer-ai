"use client";

import { useState, useCallback } from "react";

interface Props {
  onGenerate: (data: { pdfText?: string; imageBase64?: string | string[]; supplementText?: string }) => void;
  isLoading: boolean;
}

const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"];

function getFileExtension(name: string): string {
  return name.toLowerCase().slice(name.lastIndexOf("."));
}

function isImageFile(name: string): boolean {
  return IMAGE_EXTENSIONS.includes(getFileExtension(name));
}

function isPdfFile(name: string): boolean {
  return getFileExtension(name) === ".pdf";
}

export default function PdfUploader({ onGenerate, isLoading }: Props) {
  const [pdfText, setPdfText] = useState("");
  const [imageBase64, setImageBase64] = useState<string | string[]>("");
  const [fileName, setFileName] = useState("");
  const [pages, setPages] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileType, setFileType] = useState<"pdf" | "image" | "">("");
  const [supplementText, setSupplementText] = useState("");

  const resetState = () => {
    setPdfText("");
    setImageBase64([]);
    setFileName("");
    setPages(0);
    setFileType("");
    setSupplementText("");
  };

  const handleFile = useCallback(async (file: File) => {
    const ext = getFileExtension(file.name);
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      alert("PDF 또는 이미지 파일(.jpg, .png)만 업로드 가능합니다.");
      return;
    }

    setIsParsing(true);
    resetState();

    try {
      if (isPdfFile(file.name)) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/parse-pdf", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "PDF 파싱 실패");
        }

        // PDF 텍스트 추출 품질 검사
        const extractedText = (data.text || "").trim();
        if (extractedText.length < 50) {
          alert(
            "PDF에서 텍스트를 충분히 추출할 수 없습니다.\n" +
            "이 PDF는 이미지 기반일 수 있습니다.\n\n" +
            "→ PDF 대신 이미지(PNG/JPG)로 업로드해주세요.\n" +
            "→ 또는 텍스트 입력 탭에 내용을 직접 붙여넣어주세요."
          );
          return;
        }
        setPdfText(extractedText);
        setFileName(data.fileName);
        setPages(data.pages);
        setFileType("pdf");
      } else if (isImageFile(file.name)) {
        const base64 = await fileToBase64(file);
        const chunks = await splitImageIfLarge(base64);
        setImageBase64(chunks.length === 1 ? chunks[0] : chunks);
        setFileName(file.name + (chunks.length > 1 ? ` (${chunks.length}분할)` : ""));
        setFileType("image");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "파일 처리 중 오류 발생");
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const hasFile = fileType === "pdf" ? !!pdfText : Array.isArray(imageBase64) ? imageBase64.length > 0 : !!imageBase64;

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition cursor-pointer ${
          dragOver
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleInputChange}
          className="hidden"
        />
        {isParsing ? (
          <div className="flex flex-col items-center gap-2">
            <svg
              className="animate-spin h-8 w-8 text-blue-500"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <p className="text-sm text-gray-600">파일 처리 중...</p>
          </div>
        ) : (
          <>
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600">
              파일을 드래그하거나 클릭하여 업로드
            </p>
            <p className="mt-1 text-xs text-gray-400">
              PDF, JPG, PNG 파일을 업로드하세요
            </p>
          </>
        )}
      </div>

      {/* File preview */}
      {hasFile && (
        <>
          <div className="bg-gray-50 border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">
                {fileName}
                {fileType === "pdf" && ` (${pages}페이지)`}
              </span>
              <button
                onClick={resetState}
                className="text-xs text-red-500 hover:text-red-700"
              >
                삭제
              </button>
            </div>

            {fileType === "pdf" && (
              <div className="max-h-60 overflow-y-auto text-sm text-gray-600 whitespace-pre-wrap bg-white border rounded p-3">
                {pdfText.slice(0, 3000)}
                {pdfText.length > 3000 && (
                  <span className="text-gray-400">
                    ... ({pdfText.length}자 중 3000자 표시)
                  </span>
                )}
              </div>
            )}

            {fileType === "image" && (
              <div className="bg-white border rounded p-3">
                {Array.isArray(imageBase64) ? (
                  <div className="grid grid-cols-2 gap-2">
                    {imageBase64.map((chunk, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={chunk}
                        alt={`분할 ${i + 1}`}
                        className="max-h-40 object-contain rounded border"
                      />
                    ))}
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageBase64}
                    alt="업로드된 이미지"
                    className="max-h-60 object-contain rounded mx-auto"
                  />
                )}
              </div>
            )}
          </div>

          {/* 이미지 업로드 시 보조 텍스트 입력 */}
          {fileType === "image" && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                보조 텍스트 <span className="text-gray-400 font-normal">(선택사항 — 오타 방지용)</span>
              </label>
              <textarea
                value={supplementText}
                onChange={(e) => setSupplementText(e.target.value)}
                placeholder="이미지의 텍스트를 붙여넣으면 AI가 더 정확하게 TC를 생성합니다.&#10;예: 기획서의 Description 내용, 화면 설명, 정책 등"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y text-gray-900 placeholder-gray-400"
              />
              <p className="mt-1 text-xs text-gray-400">
                기획서에서 텍스트를 복사해서 붙여넣으면 AI 인식 오타가 줄어듭니다.
              </p>
            </div>
          )}

          <button
            onClick={() =>
              onGenerate(
                fileType === "pdf"
                  ? { pdfText }
                  : { imageBase64, supplementText: supplementText.trim() || undefined }
              )
            }
            disabled={isLoading}
            className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                TC 생성 중...
              </>
            ) : (
              "이 파일로 TC 생성하기"
            )}
          </button>
        </>
      )}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 고해상도 이미지를 2x2 (4분할)로 자동 분할
 * 너비 > 1500px일 때만 분할, 아니면 원본 반환
 */
function splitImageIfLarge(dataUrl: string): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // 작은 이미지는 분할 불필요
      if (img.width <= 1500) {
        resolve([dataUrl]);
        return;
      }

      const cols = 2;
      const rows = 2;
      const chunkW = Math.ceil(img.width / cols);
      const chunkH = Math.ceil(img.height / rows);
      const chunks: string[] = [];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const canvas = document.createElement("canvas");
          const sx = c * chunkW;
          const sy = r * chunkH;
          const sw = Math.min(chunkW, img.width - sx);
          const sh = Math.min(chunkH, img.height - sy);

          canvas.width = sw;
          canvas.height = sh;

          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
            chunks.push(canvas.toDataURL("image/jpeg", 0.92));
          }
        }
      }

      resolve(chunks.length > 0 ? chunks : [dataUrl]);
    };
    img.onerror = () => resolve([dataUrl]);
    img.src = dataUrl;
  });
}
