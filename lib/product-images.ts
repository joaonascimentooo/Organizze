"use client";

import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const maxInputSize = 10 * 1024 * 1024;
const maxThumbnailSize = 320 * 1024;
const localImageKey = (imageId: string) => `organizze:product-image:${imageId}`;

export function validateProductImage(file: File) {
  const accepted = ["image/jpeg", "image/png", "image/webp"];
  if (!accepted.includes(file.type)) throw new Error("Escolha uma imagem JPG, PNG ou WebP.");
  if (file.size > maxInputSize) throw new Error("A imagem deve ter no máximo 10 MB.");
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Não foi possível reduzir a imagem.")), "image/webp", quality);
  });
}

export async function optimizeProductImage(file: File) {
  validateProductImage(file);
  const bitmap = await createImageBitmap(file);
  const maxSide = 900;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar a imagem.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let quality = 0.78;
  let blob = await canvasToBlob(canvas, quality);
  while (blob.size > maxThumbnailSize && quality > 0.48) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, quality);
  }
  if (blob.size > maxThumbnailSize) throw new Error("A imagem ficou grande demais. Escolha uma imagem mais simples.");
  return blob;
}

export function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(blob);
  });
}

export async function saveProductImage(userId: string | null, imageId: string, blob: Blob) {
  const dataUrl = await blobToDataUrl(blob);
  if (userId && db) {
    await setDoc(doc(db, "users", userId, "productImages", imageId), { dataUrl, createdAt: serverTimestamp() });
  } else {
    localStorage.setItem(localImageKey(imageId), dataUrl);
  }
  return { imageId, dataUrl };
}

export async function loadProductImages(userId: string | null, imageIds: string[]) {
  const entries = await Promise.all(imageIds.map(async (imageId) => {
    if (userId && db) {
      const snapshot = await getDoc(doc(db, "users", userId, "productImages", imageId));
      return [imageId, snapshot.exists() ? String(snapshot.data().dataUrl || "") : ""] as const;
    }
    return [imageId, localStorage.getItem(localImageKey(imageId)) || ""] as const;
  }));
  return Object.fromEntries(entries.filter(([, value]) => value));
}

export async function deleteProductImage(userId: string | null, imageId?: string) {
  if (!imageId) return;
  try {
    if (userId && db) await deleteDoc(doc(db, "users", userId, "productImages", imageId));
    else localStorage.removeItem(localImageKey(imageId));
  } catch {
    // Removing a financial item should not fail if its optional image is already gone.
  }
}
