import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { FileText, Plus, Send, Download, Eye, CreditCard as Edit, Trash2, DollarSign, Calendar, User, CheckCircle, Clock, XCircle, AlertCircle, Filter } from 'lucide-react';

interface Invoice {
  id: string;
  invoice_number: string;
  issued_by: string;
  issued_to: string;
  issue_date: string;
  due_date: string;
  status: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  currency: string;
  notes: string;
  payment_method: string;
  payment_date: string;
  sent_at: string;
  issued_to_profile?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  issued_by_profile?: {
    first_name: string;
    last_name: string;
  };
}

interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export default function InvoicesSection() {
  const { profile } = useAuth();
  const { language } = useLanguage();

  const [view, setView] = useState<'list' | 'create' | 'view'>('list');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Form fields
  const [clientId, setClientId] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [taxRate, setTaxRate] = useState('0');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unit_price: 0, total: 0 },
  ]);

  const isTrainerOrAdmin = profile?.role === 'trainer' || profile?.role === 'admin';

  useEffect(() => {
    loadInvoices();
    if (isTrainerOrAdmin) {
      loadClients();
    }
  }, [isTrainerOrAdmin, filterStatus, profile?.id]);

  const loadInvoices = async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      let query = supabase
        .from('invoices')
        .select(`
          *,
          issued_to_profile:issued_to(first_name, last_name, email),
          issued_by_profile:issued_by(first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (!isTrainerOrAdmin) {
        query = query.eq('issued_to', profile.id);
      }

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      console.error('Error loading invoices:', error);
      alert(language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role')
        .in('role', ['athlete'])
        .order('first_name');

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error('Error loading clients:', error);
    }
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
    };

    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
    }

    setItems(newItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = subtotal * (parseFloat(taxRate) / 100);
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  const handleCreateInvoice = async () => {
    if (!clientId) {
      alert(language === 'es' ? 'Selecciona un cliente' : 'Select a client');
      return;
    }

    if (items.length === 0 || items.every(item => !item.description)) {
      alert(language === 'es' ? 'Agrega al menos un item' : 'Add at least one item');
      return;
    }

    setLoading(true);
    try {
      const { subtotal, taxAmount, total } = calculateTotals();

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          issued_by: profile?.id,
          issued_to: clientId,
          issue_date: issueDate,
          due_date: dueDate || null,
          status: 'draft',
          subtotal,
          tax_rate: parseFloat(taxRate),
          tax_amount: taxAmount,
          total,
          currency,
          notes,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      const itemsToInsert = items
        .filter(item => item.description)
        .map(item => ({
          invoice_id: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
        }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      alert(language === 'es' ? '✅ Factura creada' : '✅ Invoice created');
      resetForm();
      setView('list');
      loadInvoices();
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      alert(language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvoice = async (invoiceId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      if (error) throw error;

      alert(language === 'es' ? '✅ Factura enviada' : '✅ Invoice sent');
      loadInvoices();
    } catch (error: any) {
      console.error('Error sending invoice:', error);
      alert(language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          payment_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', invoiceId);

      if (error) throw error;

      alert(language === 'es' ? '✅ Factura marcada como pagada' : '✅ Invoice marked as paid');
      loadInvoices();
    } catch (error: any) {
      console.error('Error marking invoice as paid:', error);
      alert(language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setClientId('');
    setIssueDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    setCurrency('USD');
    setTaxRate('0');
    setNotes('');
    setItems([{ description: '', quantity: 1, unit_price: 0, total: 0 }]);
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      draft: { icon: Edit, color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', label: language === 'es' ? 'Borrador' : 'Draft' },
      sent: { icon: Send, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300', label: language === 'es' ? 'Enviada' : 'Sent' },
      paid: { icon: CheckCircle, color: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300', label: language === 'es' ? 'Pagada' : 'Paid' },
      overdue: { icon: AlertCircle, color: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300', label: language === 'es' ? 'Vencida' : 'Overdue' },
      cancelled: { icon: XCircle, color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', label: language === 'es' ? 'Cancelada' : 'Cancelled' },
    };
    return badges[status] || badges.draft;
  };

  const formatCurrency = (amount: number, curr: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
    }).format(amount);
  };

  const totals = calculateTotals();

  if (!isTrainerOrAdmin) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 border-4 border-[#fdda36] border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {language === 'es' ? 'No hay facturas aún' : 'No invoices yet'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedInvoice(invoice);
                    setView('view');
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        invoice.status === 'paid'
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : invoice.status === 'pending'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30'
                          : 'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        {invoice.status === 'paid' ? (
                          <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                        ) : invoice.status === 'pending' ? (
                          <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {invoice.invoice_number}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {invoice.notes || (language === 'es' ? 'Factura' : 'Invoice')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {new Date(invoice.issue_date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(parseFloat(invoice.total.toString()), invoice.currency)}
                      </p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        invoice.status === 'paid'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                          : invoice.status === 'pending'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                      }`}>
                        {invoice.status === 'paid'
                          ? (language === 'es' ? 'Pagado' : 'Paid')
                          : invoice.status === 'pending'
                          ? (language === 'es' ? 'Pendiente' : 'Pending')
                          : (language === 'es' ? 'Vencido' : 'Overdue')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {view === 'list' && (
        <div className="flex items-center justify-end">
          <button
            onClick={() => setView('create')}
            className="flex items-center gap-2 px-6 py-3 bg-[#fdda36] text-[#514163] rounded-lg font-semibold hover:bg-[#ffd51a] transition-colors"
          >
            <Plus className="w-5 h-5" />
            {language === 'es' ? 'Nueva Factura' : 'New Invoice'}
          </button>
        </div>
      )}

      {view === 'list' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
            >
              <option value="all">{language === 'es' ? 'Todas' : 'All'}</option>
              <option value="draft">{language === 'es' ? 'Borradores' : 'Drafts'}</option>
              <option value="sent">{language === 'es' ? 'Enviadas' : 'Sent'}</option>
              <option value="paid">{language === 'es' ? 'Pagadas' : 'Paid'}</option>
              <option value="overdue">{language === 'es' ? 'Vencidas' : 'Overdue'}</option>
            </select>
          </div>

          <div className="grid gap-4">
            {invoices.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {language === 'es' ? 'No hay facturas aún' : 'No invoices yet'}
                </p>
                <button
                  onClick={() => setView('create')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#fdda36] text-[#514163] rounded-lg font-semibold hover:bg-[#ffd51a] transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  {language === 'es' ? 'Crear Primera Factura' : 'Create First Invoice'}
                </button>
              </div>
            ) : (
              invoices.map((invoice) => {
                const statusBadge = getStatusBadge(invoice.status);
                const StatusIcon = statusBadge.icon;

                return (
                  <div
                    key={invoice.id}
                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:border-[#fdda36] transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {invoice.invoice_number}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${statusBadge.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusBadge.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>
                              {invoice.issued_to_profile?.first_name} {invoice.issued_to_profile?.last_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(invoice.issue_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {formatCurrency(invoice.total, invoice.currency)}
                        </div>
                        {invoice.due_date && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {language === 'es' ? 'Vence:' : 'Due:'} {new Date(invoice.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {invoice.status === 'draft' && (
                        <button
                          onClick={() => handleSendInvoice(invoice.id)}
                          disabled={loading}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
                        >
                          <Send className="w-4 h-4" />
                          {language === 'es' ? 'Enviar' : 'Send'}
                        </button>
                      )}
                      {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                        <button
                          onClick={() => handleMarkAsPaid(invoice.id)}
                          disabled={loading}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                          {language === 'es' ? 'Marcar Pagada' : 'Mark as Paid'}
                        </button>
                      )}
                      <button
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        {language === 'es' ? 'Ver' : 'View'}
                      </button>
                      <button
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
                      >
                        <Download className="w-4 h-4" />
                        PDF
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {view === 'create' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {language === 'es' ? 'Nueva Factura' : 'New Invoice'}
            </h2>
            <button
              onClick={() => {
                setView('list');
                resetForm();
              }}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </button>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'es' ? 'Cliente' : 'Client'} *
                </label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                >
                  <option value="">{language === 'es' ? 'Seleccionar cliente' : 'Select client'}</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.first_name} {client.last_name} ({client.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'es' ? 'Moneda' : 'Currency'}
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="ARS">ARS - Peso Argentino</option>
                  <option value="MXN">MXN - Peso Mexicano</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'es' ? 'Fecha de Emisión' : 'Issue Date'}
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'es' ? 'Fecha de Vencimiento' : 'Due Date'}
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {language === 'es' ? 'Items' : 'Items'}
                </h3>
                <button
                  onClick={addItem}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  {language === 'es' ? 'Agregar Item' : 'Add Item'}
                </button>
              </div>

              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-4 items-start">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder={language === 'es' ? 'Descripción' : 'Description'}
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                      />
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        placeholder={language === 'es' ? 'Cant.' : 'Qty'}
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        placeholder={language === 'es' ? 'Precio' : 'Price'}
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="w-32">
                      <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white text-right font-semibold">
                        {formatCurrency(item.total, currency)}
                      </div>
                    </div>
                    {items.length > 1 && (
                      <button
                        onClick={() => removeItem(index)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="max-w-md ml-auto space-y-3">
                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                  <span>{language === 'es' ? 'Subtotal:' : 'Subtotal:'}</span>
                  <span className="font-semibold">{formatCurrency(totals.subtotal, currency)}</span>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <span className="text-gray-700 dark:text-gray-300">{language === 'es' ? 'Impuesto:' : 'Tax:'}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      className="w-20 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36] text-sm"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <span className="text-gray-700 dark:text-gray-300">%</span>
                    <span className="font-semibold text-gray-900 dark:text-white w-24 text-right">
                      {formatCurrency(totals.taxAmount, currency)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-3">
                  <span>{language === 'es' ? 'Total:' : 'Total:'}</span>
                  <span>{formatCurrency(totals.total, currency)}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'es' ? 'Notas' : 'Notes'}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                placeholder={language === 'es' ? 'Información adicional...' : 'Additional information...'}
              />
            </div>

            <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setView('list');
                  resetForm();
                }}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleCreateInvoice}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-[#fdda36] text-[#514163] rounded-lg font-semibold hover:bg-[#ffd51a] transition-colors disabled:opacity-50"
              >
                <FileText className="w-5 h-5" />
                {loading
                  ? language === 'es'
                    ? 'Creando...'
                    : 'Creating...'
                  : language === 'es'
                  ? 'Crear Factura'
                  : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
