import React, { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Upload, Paperclip, X, Loader2, Image, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultimodalInputProps {
  input?: string;
  setInput: (value: string) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  stop: () => void;
  messages?: any[];
  sendMessage?: (message: any) => void;
  className?: string;
}

interface AttachmentType {
  url: string;
  name: string;
  contentType: string;
  size: number;
}

export function MultimodalInput({
  input,
  setInput,
  handleSubmit,
  isLoading,
  stop,
  messages = [],
  sendMessage,
  className = '',
}: MultimodalInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<AttachmentType[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 120); // Max height of ~6 lines
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  React.useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((input?.trim() || '') && !isLoading) {
        handleSubmit(e as any);
      }
    }
  };

  const handleFileChange = async (files: FileList | null) => {
    if (!files) return;

    const newAttachments: AttachmentType[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`Filen "${file.name}" är för stor (max 10MB)`);
        continue;
      }

      // Validate file type
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
        'application/pdf', 'text/plain', 'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];

      if (!allowedTypes.includes(file.type)) {
        alert(`Filtypen "${file.type}" stöds inte`);
        continue;
      }

      try {
        // Upload file to server
        const formData = new FormData();
        formData.append('file', file);
        formData.append('entityType', 'receipt');
        formData.append('entityId', `temp-${Date.now()}`);
        formData.append('isPrimary', 'true');
        formData.append('uploadedBy', 'user');

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        
        if (result.success) {
          // Create attachment with server URL
          newAttachments.push({
            url: result.url,
            name: file.name,
            contentType: file.type,
            size: file.size,
          });
        } else {
          console.error('Upload failed:', result.error);
          alert(`Kunde inte ladda upp "${file.name}": ${result.error}`);
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        alert(`Kunde inte behandla filen "${file.name}"`);
      }
    }

    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const newAttachments = [...prev];
      // Don't revoke URLs since they're now server URLs
      newAttachments.splice(index, 1);
      return newAttachments;
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) return Image;
    if (contentType === 'application/pdf') return FileText;
    return Paperclip;
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (isLoading) {
      stop();
      return;
    }

    if (!(input?.trim() || '') && attachments.length === 0) return;

    // Create message with multimodal content
    if (sendMessage && attachments.length > 0) {
      const parts = [];
      
      // Add text if present
      if (input?.trim()) {
        parts.push({ type: 'text', text: input.trim() });
      }

      // Add attachments
      attachments.forEach(attachment => {
        if (attachment.contentType.startsWith('image/')) {
          parts.push({
            type: 'image',
            url: attachment.url,
            mediaType: attachment.contentType,
          });
        } else {
          parts.push({
            type: 'file',
            url: attachment.url,
            mediaType: attachment.contentType,
            name: attachment.name,
          });
        }
      });

      sendMessage({
        id: `user-${Date.now()}`,
        role: 'user',
        parts,
      });

      // Clear attachments
      setAttachments([]);
      setInput('');
    } else {
      handleSubmit(e);
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((attachment, index) => {
            const FileIcon = getFileIcon(attachment.contentType);
            return (
              <div 
                key={index}
                className="flex items-center gap-2 bg-gray-100 rounded-lg p-2 text-sm max-w-xs"
              >
                <FileIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{attachment.name}</div>
                  <div className="text-gray-500 text-xs">{formatFileSize(attachment.size)}</div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto"
                  onClick={() => removeAttachment(index)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Input form */}
      <form onSubmit={onSubmit} className="space-y-3">
        <div 
          className={cn(
            'relative border rounded-lg transition-colors',
            isDragging ? 'border-gray-400 bg-gray-50' : 'border-gray-200',
            'focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-gray-400/20'
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <Textarea
            ref={textareaRef}
            value={input || ''}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ställ en fråga eller beskriv vad du behöver hjälp med... (Dra och släpp filer här eller använd 📎)"
            className="min-h-[48px] max-h-[120px] resize-none border-0 focus:ring-0 pr-24 py-3"
            disabled={isLoading}
          />
          
          {/* Drag overlay */}
          {isDragging && (
            <div className="absolute inset-0 bg-gray-50/90 border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center">
              <div className="text-gray-600 text-center">
                <Upload className="w-8 h-8 mx-auto mb-2" />
                <div className="font-medium">Släpp filer här</div>
                <div className="text-sm">Bilder, PDF, Excel stöds</div>
              </div>
            </div>
          )}

          {/* Control buttons */}
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.txt,.csv,.xlsx,.xls"
              onChange={(e) => handleFileChange(e.target.files)}
              className="hidden"
            />
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="p-2 h-8 w-8"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              title="Bifoga filer"
            >
              <Paperclip className="w-4 h-4" />
            </Button>

            <Button
              type="submit"
              size="sm"
              className="p-2 h-8 w-8"
              disabled={(!(input?.trim() || '') && attachments.length === 0) || isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Help text */}
        <div className="text-xs text-gray-500 flex items-center justify-between">
          <span>
            Tryck Enter för att skicka, Shift+Enter för ny rad
          </span>
          <span>
            Stöds: Bilder, PDF, Excel, CSV (max 10MB)
          </span>
        </div>
      </form>
    </div>
  );
}

// Create a simple Textarea component if it doesn't exist
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"
