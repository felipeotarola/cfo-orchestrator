import { NextRequest, NextResponse } from 'next/server';
import { uploadFile, type FileUploadOptions } from '@/lib/utils/file-upload';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const entityType = formData.get('entityType') as string;
    const entityId = formData.get('entityId') as string;
    const isPrimary = formData.get('isPrimary') === 'true';
    const description = formData.get('description') as string;
    const uploadedBy = formData.get('uploadedBy') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!entityType || !entityId) {
      return NextResponse.json(
        { success: false, error: 'entityType and entityId are required' },
        { status: 400 }
      );
    }

    // Upload file to Vercel Blob
    const uploadOptions: FileUploadOptions = {
      entityType: entityType as 'invoice' | 'receipt' | 'client',
      entityId,
      isPrimary,
      description,
      uploadedBy
    };

    const uploadResult = await uploadFile(file, uploadOptions);

    if (!uploadResult.success) {
      return NextResponse.json(uploadResult, { status: 400 });
    }

    // Save attachment record to database
    const supabase = await createServerSupabaseClient();
    
    // If entityId is a temporary ID, create a receipt first
    let actualEntityId = entityId;
    if (entityType === 'receipt' && entityId.startsWith('temp-')) {
      // Create a new receipt first
      const { data: newReceipt, error: receiptError } = await supabase
        .from('receipts')
        .insert({
          receipt_number: `REC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
          vendor_name: 'Unknown Vendor',
          amount: 0,
          receipt_date: new Date().toISOString().split('T')[0],
          category: 'Kontorsmaterial',
          status: 'pending',
          submitted_by: uploadedBy || 'user'
        })
        .select()
        .single();

      if (receiptError) {
        console.error('Error creating receipt:', receiptError);
        return NextResponse.json(
          { success: false, error: 'Failed to create receipt for attachment' },
          { status: 500 }
        );
      }

      actualEntityId = newReceipt.id;
    }
    
    const { data: attachment, error: dbError } = await supabase
      .from('attachments')
      .insert({
        entity_type: entityType,
        entity_id: actualEntityId,
        file_name: uploadResult.fileName,
        file_type: uploadResult.fileType,
        file_size: uploadResult.fileSize,
        file_url: uploadResult.url,
        description,
        uploaded_by: uploadedBy,
        is_primary: isPrimary
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error saving attachment:', dbError);
      return NextResponse.json(
        { success: false, error: 'Failed to save attachment record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      attachment,
      ...uploadResult
    });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    if (!entityType || !entityId) {
      return NextResponse.json(
        { success: false, error: 'entityType and entityId are required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    
    const { data: attachments, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('upload_date', { ascending: false });

    if (error) {
      console.error('Database error fetching attachments:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch attachments' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      attachments
    });

  } catch (error) {
    console.error('Fetch API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Fetch failed' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('id');

    if (!attachmentId) {
      return NextResponse.json(
        { success: false, error: 'Attachment ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    
    // Get attachment details first
    const { data: attachment, error: fetchError } = await supabase
      .from('attachments')
      .select('*')
      .eq('id', attachmentId)
      .single();

    if (fetchError || !attachment) {
      return NextResponse.json(
        { success: false, error: 'Attachment not found' },
        { status: 404 }
      );
    }

    // Delete from database first
    const { error: deleteError } = await supabase
      .from('attachments')
      .delete()
      .eq('id', attachmentId);

    if (deleteError) {
      console.error('Database error deleting attachment:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete attachment record' },
        { status: 500 }
      );
    }

    // Then delete from Vercel Blob (don't fail if this doesn't work)
    try {
      const { del } = await import('@vercel/blob');
      await del(attachment.file_url);
    } catch (blobError) {
      console.warn('Failed to delete file from blob storage:', blobError);
      // Continue anyway since database record is already deleted
    }

    return NextResponse.json({
      success: true,
      message: 'Attachment deleted successfully'
    });

  } catch (error) {
    console.error('Delete API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Delete failed' 
      },
      { status: 500 }
    );
  }
}
