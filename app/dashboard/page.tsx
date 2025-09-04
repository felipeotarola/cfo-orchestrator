'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  status: string;
  attachment_count: number;
  clients?: {
    name: string;
    email: string;
  };
}

interface Receipt {
  id: string;
  receipt_number: string;
  vendor_name: string;
  amount: number;
  receipt_date: string;
  category: string;
  status: string;
  attachment_count: number;
  primary_image_url?: string;
}

interface Attachment {
  id: string;
  entity_type: string;
  entity_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  upload_date: string;
  is_primary: boolean;
}

export default function Dashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'invoices' | 'receipts' | 'attachments'>('invoices');

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // First try to fetch from Supabase
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          *,
          clients (name, email)
        `)
        .order('issue_date', { ascending: false })
        .limit(50);

      if (invoicesError) {
        console.error('Error fetching invoices:', invoicesError);
        // Fall back to mock data if Supabase fails
        console.log('Falling back to mock data...');
        
        const mockInvoices = [
          {
            id: '1',
            invoice_number: 'INV-2024-001',
            client_id: '1',
            issue_date: '2024-10-15',
            due_date: '2024-11-14',
            subtotal: 9600.00,
            tax_amount: 2400.00,
            total_amount: 12000.00,
            status: 'paid',
            notes: 'Webbutveckling för ny företagswebbsida',
            attachment_count: 0,
            clients: {
              name: 'Joakim Svensson',
              email: 'joakim.svensson@techab.se'
            }
          },
          {
            id: '2',
            invoice_number: 'INV-2024-002',
            client_id: '1',
            issue_date: '2024-11-15',
            due_date: '2024-12-15',
            subtotal: 4800.00,
            tax_amount: 1200.00,
            total_amount: 6000.00,
            status: 'sent',
            notes: 'Databasdesign och implementation',
            attachment_count: 0,
            clients: {
              name: 'Joakim Svensson',
              email: 'joakim.svensson@techab.se'
            }
          },
          {
            id: '3',
            invoice_number: 'INV-2024-003',
            client_id: '2',
            issue_date: '2024-11-01',
            due_date: '2024-11-15',
            subtotal: 7200.00,
            tax_amount: 1800.00,
            total_amount: 9000.00,
            status: 'paid',
            notes: 'Grafisk design och varumärkesarbete',
            attachment_count: 0,
            clients: {
              name: 'Anna Lindberg',
              email: 'anna.lindberg@designstudio.se'
            }
          }
        ];
        setInvoices(mockInvoices);
      } else {
        setInvoices(invoicesData || []);
      }

      // Fetch receipts from the correct table
      const { data: receiptsData, error: receiptsError } = await supabase
        .from('receipts')
        .select('*')
        .order('receipt_date', { ascending: false })
        .limit(50);

      if (receiptsError) {
        console.log('Receipts table error:', receiptsError.message);
        // Fall back to mock receipts
        const mockReceipts = [
          {
            id: '1',
            receipt_number: 'KV-2024-001',
            vendor_name: 'Office Depot',
            amount: 1250.00,
            currency: 'SEK',
            receipt_date: '2024-11-01',
            category: 'Kontorsmaterial',
            status: 'approved',
            attachment_count: 0
          },
          {
            id: '2',
            receipt_number: 'KV-2024-002',
            vendor_name: 'ICA Maxi',
            amount: 680.00,
            currency: 'SEK',
            receipt_date: '2024-11-05',
            category: 'Måltider',
            status: 'pending',
            attachment_count: 0
          }
        ];
        setReceipts(mockReceipts);
      } else {
        // For each receipt, get its primary attachment/image
        const receiptsWithImages = await Promise.all(
          (receiptsData || []).map(async (receipt) => {
            const { data: attachmentData } = await supabase
              .from('attachments')
              .select('file_url, file_type')
              .eq('entity_type', 'receipt')
              .eq('entity_id', receipt.id)
              .eq('is_primary', true)
              .single();

            return {
              ...receipt,
              primary_image_url: attachmentData?.file_url || null,
              attachment_count: 1 // We'll get proper count if needed
            };
          })
        );
        setReceipts(receiptsWithImages);
      }

      // Fetch attachments
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('attachments')
        .select('*')
        .order('upload_date', { ascending: false })
        .limit(50);

      if (attachmentsError) {
        console.log('Attachments table not available yet:', attachmentsError.message);
        setAttachments([]);
      } else {
        setAttachments(attachmentsData || []);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      // Use mock data as complete fallback
      console.log('Using complete mock data fallback...');
      setInvoices([]);
      setReceipts([]);
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK'
    }).format(amount);
  };

  const formatFileSize = (bytes: number) => {
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const deleteInvoice = async (invoiceId: string, invoiceNumber: string) => {
    if (!confirm(`Are you sure you want to delete invoice ${invoiceNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (error) {
        toast.error('Error deleting invoice: ' + error.message);
      } else {
        toast.success(`Invoice ${invoiceNumber} deleted successfully`);
        fetchData(); // Refresh the data
      }
    } catch (error) {
      toast.error('Error deleting invoice: ' + (error as Error).message);
    }
  };

  const deleteReceipt = async (receiptId: string, receiptNumber: string) => {
    if (!confirm(`Are you sure you want to delete receipt ${receiptNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      // Delete associated attachments first
      const { error: attachmentError } = await supabase
        .from('attachments')
        .delete()
        .eq('entity_type', 'receipt')
        .eq('entity_id', receiptId);

      if (attachmentError) {
        console.warn('Error deleting receipt attachments:', attachmentError);
      }

      // Delete the receipt
      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', receiptId);

      if (error) {
        toast.error('Error deleting receipt: ' + error.message);
      } else {
        toast.success(`Receipt ${receiptNumber} deleted successfully`);
        fetchData(); // Refresh the data
      }
    } catch (error) {
      toast.error('Error deleting receipt: ' + (error as Error).message);
    }
  };

  const deleteAttachment = async (attachmentId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete attachment "${fileName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('attachments')
        .delete()
        .eq('id', attachmentId);

      if (error) {
        toast.error('Error deleting attachment: ' + error.message);
      } else {
        toast.success(`Attachment "${fileName}" deleted successfully`);
        fetchData(); // Refresh the data
      }
    } catch (error) {
      toast.error('Error deleting attachment: ' + (error as Error).message);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      reimbursed: 'bg-purple-100 text-purple-800'
    };

    const colorClass = statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 gradient-primary smooth-border flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600 font-medium">Laddar dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">CFO Dashboard</h1>
              <p className="text-lg text-gray-600 font-medium">Översikt av fakturor, kvitton och bilagor</p>
            </div>
            <Link href="/">
              <button className="glass-effect hover:bg-gray-50 text-gray-700 px-6 py-3 smooth-border text-sm font-semibold transition-all duration-200 soft-shadow border border-gray-200">
                💬 Tillbaka till Chat
              </button>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-1 glass-effect p-2 smooth-border soft-shadow">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`py-3 px-6 smooth-border font-semibold text-sm transition-all duration-200 ${
                activeTab === 'invoices'
                  ? 'bg-gray-600 text-white soft-shadow'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              📄 Fakturor ({invoices.length})
            </button>
            <button
              onClick={() => setActiveTab('receipts')}
              className={`py-3 px-6 smooth-border font-semibold text-sm transition-all duration-200 ${
                activeTab === 'receipts'
                  ? 'bg-gray-600 text-white soft-shadow'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              🧾 Kvitton ({receipts.length})
            </button>
            <button
              onClick={() => setActiveTab('attachments')}
              className={`py-3 px-6 smooth-border font-semibold text-sm transition-all duration-200 ${
                activeTab === 'attachments'
                  ? 'bg-gray-600 text-white soft-shadow'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              📎 Bilagor ({attachments.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="gradient-card soft-shadow-lg smooth-border">
          {activeTab === 'invoices' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="gradient-secondary">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Faktura
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Klient
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Belopp
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Förfallodatum
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Bilagor
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Åtgärder
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{invoice.invoice_number}</div>
                        <div className="text-sm text-gray-500">{invoice.issue_date}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{invoice.clients?.name || 'Unknown'}</div>
                        <div className="text-sm text-gray-500">{invoice.clients?.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(invoice.total_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.due_date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(invoice.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.attachment_count > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            📎 {invoice.attachment_count}
                          </span>
                        ) : (
                          <span className="text-gray-400">No attachments</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => deleteInvoice(invoice.id, invoice.invoice_number)}
                          className="text-gray-600 hover:text-red-700 bg-gray-50 hover:bg-red-50 px-3 py-1 smooth-border transition-colors border border-gray-200"
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                        No invoices found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'receipts' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Receipt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Image
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {receipts.map((receipt) => (
                    <tr key={receipt.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{receipt.receipt_number}</div>
                        <div className="text-sm text-gray-500">{receipt.receipt_date}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {receipt.vendor_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(receipt.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {receipt.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(receipt.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {receipt.primary_image_url ? (
                          <div className="flex items-center space-x-3">
                            <Image
                              src={receipt.primary_image_url}
                              alt={`Receipt ${receipt.receipt_number}`}
                              width={60}
                              height={60}
                              className="rounded-lg object-cover border shadow-sm"
                            />
                            <div className="text-xs text-gray-500">
                              <div>Primary image</div>
                              {receipt.attachment_count > 1 && (
                                <div>+{receipt.attachment_count - 1} more</div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No image</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => deleteReceipt(receipt.id, receipt.receipt_number)}
                          className="text-gray-600 hover:text-red-700 bg-gray-50 hover:bg-red-50 px-3 py-1 smooth-border transition-colors border border-gray-200"
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {receipts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                        No receipts found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'attachments' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Uploaded
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Preview
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attachments.map((attachment) => (
                    <tr key={attachment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{attachment.file_name}</div>
                        <div className="text-sm text-gray-500">{attachment.file_type}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          attachment.file_type.startsWith('image/') 
                            ? 'bg-gray-100 text-gray-800' 
                            : 'bg-gray-200 text-gray-800'
                        }`}>
                          {attachment.file_type.startsWith('image/') ? '🖼️ Image' : '📄 Document'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{attachment.entity_type}</div>
                        <div className="text-sm text-gray-500">{attachment.entity_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatFileSize(attachment.file_size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(attachment.upload_date).toLocaleDateString('sv-SE')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {attachment.file_type.startsWith('image/') ? (
                          <Image
                            src={attachment.file_url}
                            alt={attachment.file_name}
                            width={50}
                            height={50}
                            className="rounded-md object-cover border shadow-sm"
                          />
                        ) : (
                          <a
                            href={attachment.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 hover:text-gray-900 text-sm"
                          >
                            📄 View
                          </a>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => deleteAttachment(attachment.id, attachment.file_name)}
                          className="text-gray-600 hover:text-red-700 bg-gray-50 hover:bg-red-50 px-3 py-1 smooth-border transition-colors border border-gray-200"
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {attachments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                        No attachments found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Refresh button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={fetchData}
            className="glass-effect hover:bg-gray-50 text-gray-700 px-4 py-2 smooth-border text-sm font-medium transition-all duration-200 soft-shadow border border-gray-200"
          >
            🔄 Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
}
