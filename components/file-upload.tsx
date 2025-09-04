'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface FileUploadProps {
  entityType: 'invoice' | 'receipt' | 'client';
  entityId: string;
  onUploadComplete?: (result: any) => void;
  onUploadError?: (error: string) => void;
  accept?: string;
  maxSize?: number; // in bytes
  multiple?: boolean;
}

export function FileUpload({
  entityType,
  entityId,
  onUploadComplete,
  onUploadError,
  accept = 'image/*,application/pdf',
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = false
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0]; // Handle single file for now

    // Validate file size
    if (file.size > maxSize) {
      const error = `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${(maxSize / 1024 / 1024).toFixed(0)}MB`;
      onUploadError?.(error);
      return;
    }

    // Validate file type
    const allowedTypes = accept.split(',').map(t => t.trim());
    if (!allowedTypes.some(type => {
      if (type === 'image/*') return file.type.startsWith('image/');
      if (type === 'application/pdf') return file.type === 'application/pdf';
      return file.type === type;
    })) {
      const error = `File type ${file.type} not allowed. Accepted types: ${accept}`;
      onUploadError?.(error);
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);
      formData.append('uploadedBy', 'user'); // Would be actual user in real app

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success || response.ok) {
        onUploadComplete?.(result);
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      onUploadError?.(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => handleFileUpload(e.target.files)}
        className="hidden"
      />
      
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${dragActive ? 'border-gray-500 bg-gray-50' : 'border-gray-300 hover:border-gray-400'}
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={!isUploading ? handleClick : undefined}
      >
        {isUploading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
            <span className="text-gray-600">Uploading...</span>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-4xl">📎</div>
            <div className="text-lg font-medium text-gray-700">
              Drop files here or click to browse
            </div>
            <div className="text-sm text-gray-500">
              Supports: Images (JPEG, PNG, WebP, HEIC) and PDFs
            </div>
            <div className="text-xs text-gray-400">
              Maximum size: {(maxSize / 1024 / 1024).toFixed(0)}MB
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={isUploading}
        >
          📁 Choose File
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // Could implement camera capture here
            alert('Camera capture would be implemented here for mobile devices');
          }}
          disabled={isUploading}
        >
          📷 Take Photo
        </Button>
      </div>
    </div>
  );
}

interface AttachmentListProps {
  entityType: 'invoice' | 'receipt' | 'client';
  entityId: string;
  onDelete?: (attachmentId: string) => void;
}

export function AttachmentList({ entityType, entityId, onDelete }: AttachmentListProps) {
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAttachments = async () => {
    try {
      const response = await fetch(`/api/upload?entityType=${entityType}&entityId=${entityId}`);
      const result = await response.json();
      
      if (result.success) {
        setAttachments(result.attachments || []);
      }
    } catch (error) {
      console.error('Error loading attachments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return;

    try {
      const response = await fetch(`/api/upload?id=${attachmentId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        setAttachments(prev => prev.filter(att => att.id !== attachmentId));
        onDelete?.(attachmentId);
      } else {
        alert('Failed to delete attachment');
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
      alert('Failed to delete attachment');
    }
  };

  useEffect(() => {
    loadAttachments();
  }, [entityType, entityId]);

  if (loading) {
    return <div className="text-center py-4">Loading attachments...</div>;
  }

  if (attachments.length === 0) {
    return <div className="text-gray-500 text-center py-4">No attachments yet</div>;
  }

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-gray-900">Attachments ({attachments.length})</h4>
      <div className="space-y-2">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center justify-between p-3 border rounded-lg"
          >
            <div className="flex items-center space-x-3">
              <div className="text-2xl">
                {attachment.file_type?.startsWith('image/') ? '🖼️' : '📄'}
              </div>
              <div>
                <div className="font-medium">{attachment.file_name}</div>
                <div className="text-sm text-gray-500">
                  {new Date(attachment.upload_date).toLocaleDateString()} • 
                  {attachment.file_size ? ` ${(attachment.file_size / 1024).toFixed(0)} KB` : ''}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(attachment.file_url, '_blank')}
              >
                👁️ View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(attachment.id)}
                className="text-red-600 hover:text-red-700"
              >
                🗑️ Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
