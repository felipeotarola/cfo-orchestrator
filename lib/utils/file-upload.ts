import { put, del, list } from '@vercel/blob';
import { NextRequest } from 'next/server';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
}

export interface FileUploadOptions {
  entityType: 'invoice' | 'receipt' | 'client';
  entityId: string;
  isPrimary?: boolean;
  description?: string;
  uploadedBy?: string;
}

/**
 * Upload a file to Vercel Blob storage
 */
export async function uploadFile(
  file: File, 
  options: FileUploadOptions
): Promise<UploadResult> {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN environment variable is required');
    }

    // Validate file type (images and PDFs only)
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'image/heic',
      'application/pdf'
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: `File type ${file.type} not allowed. Only images (JPEG, PNG, WebP, HEIC) and PDFs are supported.`
      };
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of 10MB.`
      };
    }

    // Generate a unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExtension = file.name.split('.').pop() || 'bin';
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${options.entityType}/${options.entityId}/${timestamp}_${sanitizedName}`;

    // Upload to Vercel Blob
    const blob = await put(fileName, file, {
      access: 'public',
      contentType: file.type,
    });

    return {
      success: true,
      url: blob.url,
      fileName: sanitizedName,
      fileSize: file.size,
      fileType: file.type
    };

  } catch (error) {
    console.error('File upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload file'
    };
  }
}

/**
 * Convert FileList to individual File objects with data URLs for immediate display
 */
export async function convertFilesToDataURLs(files: FileList): Promise<Array<{
  type: 'file';
  mediaType: string;
  url: string;
  name: string;
  size: number;
}>> {
  return Promise.all(
    Array.from(files).map(
      file =>
        new Promise<{
          type: 'file';
          mediaType: string;
          url: string;
          name: string;
          size: number;
        }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              type: 'file',
              mediaType: file.type,
              url: reader.result as string,
              name: file.name,
              size: file.size
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }),
    ),
  );
}

/**
 * Delete a file from Vercel Blob storage
 */
export async function deleteFile(url: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN environment variable is required');
    }

    await del(url);
    return { success: true };

  } catch (error) {
    console.error('File deletion error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete file'
    };
  }
}

/**
 * List files for a specific entity
 */
export async function listFiles(entityType: string, entityId: string) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN environment variable is required');
    }

    const { blobs } = await list({
      prefix: `${entityType}/${entityId}/`,
    });

    return {
      success: true,
      files: blobs.map(blob => ({
        url: blob.url,
        fileName: blob.pathname.split('/').pop() || '',
        uploadedAt: blob.uploadedAt,
        size: blob.size
      }))
    };

  } catch (error) {
    console.error('File listing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list files',
      files: []
    };
  }
}

/**
 * Process file upload from form data
 */
export async function processFileUpload(
  request: NextRequest,
  options: FileUploadOptions
): Promise<UploadResult> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return {
        success: false,
        error: 'No file provided'
      };
    }

    return await uploadFile(file, options);

  } catch (error) {
    console.error('Form processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process upload'
    };
  }
}
