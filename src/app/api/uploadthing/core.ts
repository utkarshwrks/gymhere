import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

/**
 * Upload endpoints. Auth is intentionally light in Phase 1 (demo); later phases
 * tie uploads to the signed-in gym. Files: gym logos, member photos.
 */
export const ourFileRouter = {
  gymLogo: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } }).onUploadComplete(
    async ({ file }) => ({ url: file.ufsUrl }),
  ),
  memberPhoto: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } }).onUploadComplete(
    async ({ file }) => ({ url: file.ufsUrl }),
  ),
  gymPhoto: f({ image: { maxFileSize: "8MB", maxFileCount: 10 } }).onUploadComplete(
    async ({ file }) => ({ url: file.ufsUrl }),
  ),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
