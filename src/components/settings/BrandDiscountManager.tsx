import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { Gift, Tag, Plus, X, Save, Star, Calendar } from 'lucide-react';

interface AthleteProfile {
  id: string;
  full_name: string;
  is_elite: boolean;
  brand_messages: any[];
  partner_discounts: any[];
}

export default function BrandDiscountManager() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Brand Message Form
  const [showBrandMessageForm, setShowBrandMessageForm] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [brandMessage, setBrandMessage] = useState('');
  const [offerDetails, setOfferDetails] = useState('');

  // Discount Form
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [discountBrandName, setDiscountBrandName] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [discountDescription, setDiscountDescription] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadAthletes();
    }
  }, [isAdmin]);

  const loadAthletes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, is_elite, brand_messages, partner_discounts')
        .eq('role', 'athlete')
        .order('full_name');

      if (error) throw error;
      setAthletes(data || []);
    } catch (error) {
      console.error('Error loading athletes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedAthleteData = () => {
    return athletes.find((a) => a.id === selectedAthlete);
  };

  const handleToggleEliteStatus = async () => {
    if (!selectedAthlete) return;

    const athlete = getSelectedAthleteData();
    if (!athlete) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_elite: !athlete.is_elite })
        .eq('id', selectedAthlete);

      if (error) throw error;

      alert(
        language === 'es'
          ? `✅ Estado Elite ${!athlete.is_elite ? 'activado' : 'desactivado'}`
          : `✅ Elite Status ${!athlete.is_elite ? 'enabled' : 'disabled'}`
      );
      await loadAthletes();
    } catch (error: any) {
      alert(language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`);
    }
  };

  const handleAddBrandMessage = async () => {
    if (!selectedAthlete || !brandName || !brandMessage) {
      alert(language === 'es' ? 'Completa todos los campos requeridos' : 'Complete all required fields');
      return;
    }

    const athlete = getSelectedAthleteData();
    if (!athlete) return;

    setSaving(true);
    try {
      const newMessage = {
        brand_name: brandName,
        message: brandMessage,
        offer_details: offerDetails,
        created_at: new Date().toISOString(),
      };

      const updatedMessages = [...(athlete.brand_messages || []), newMessage];

      const { error } = await supabase
        .from('profiles')
        .update({ brand_messages: updatedMessages })
        .eq('id', selectedAthlete);

      if (error) throw error;

      alert(language === 'es' ? '✅ Mensaje de marca agregado' : '✅ Brand message added');
      setBrandName('');
      setBrandMessage('');
      setOfferDetails('');
      setShowBrandMessageForm(false);
      await loadAthletes();
    } catch (error: any) {
      alert(language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddDiscount = async () => {
    if (!selectedAthlete || !discountBrandName || !discountCode || !discountDescription) {
      alert(language === 'es' ? 'Completa todos los campos requeridos' : 'Complete all required fields');
      return;
    }

    const athlete = getSelectedAthleteData();
    if (!athlete) return;

    setSaving(true);
    try {
      const newDiscount = {
        brand_name: discountBrandName,
        discount_code: discountCode,
        description: discountDescription,
        expires_at: expiresAt || null,
        created_at: new Date().toISOString(),
      };

      const updatedDiscounts = [...(athlete.partner_discounts || []), newDiscount];

      const { error } = await supabase
        .from('profiles')
        .update({ partner_discounts: updatedDiscounts })
        .eq('id', selectedAthlete);

      if (error) throw error;

      alert(language === 'es' ? '✅ Descuento agregado' : '✅ Discount added');
      setDiscountBrandName('');
      setDiscountCode('');
      setDiscountDescription('');
      setExpiresAt('');
      setShowDiscountForm(false);
      await loadAthletes();
    } catch (error: any) {
      alert(language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveBrandMessage = async (index: number) => {
    if (!selectedAthlete) return;

    const athlete = getSelectedAthleteData();
    if (!athlete) return;

    try {
      const updatedMessages = athlete.brand_messages.filter((_, i) => i !== index);

      const { error } = await supabase
        .from('profiles')
        .update({ brand_messages: updatedMessages })
        .eq('id', selectedAthlete);

      if (error) throw error;

      alert(language === 'es' ? '✅ Mensaje eliminado' : '✅ Message removed');
      await loadAthletes();
    } catch (error: any) {
      alert(language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`);
    }
  };

  const handleRemoveDiscount = async (index: number) => {
    if (!selectedAthlete) return;

    const athlete = getSelectedAthleteData();
    if (!athlete) return;

    try {
      const updatedDiscounts = athlete.partner_discounts.filter((_, i) => i !== index);

      const { error } = await supabase
        .from('profiles')
        .update({ partner_discounts: updatedDiscounts })
        .eq('id', selectedAthlete);

      if (error) throw error;

      alert(language === 'es' ? '✅ Descuento eliminado' : '✅ Discount removed');
      await loadAthletes();
    } catch (error: any) {
      alert(language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`);
    }
  };

  if (!isAdmin) {
    return null;
  }

  const athlete = getSelectedAthleteData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#fdda36] to-[#ffd51a] rounded-xl p-6">
        <h2 className="text-2xl font-bold text-[#514163] mb-2 flex items-center gap-2">
          <Tag className="w-6 h-6" />
          {language === 'es' ? 'Gestión de Marcas y Descuentos' : 'Brand & Discount Management'}
        </h2>
        <p className="text-[#514163]/80 text-sm">
          {language === 'es'
            ? 'Administra mensajes de marcas para atletas elite y descuentos para todos los atletas'
            : 'Manage brand messages for elite athletes and discounts for all athletes'}
        </p>
      </div>

      {/* Athlete Selector */}
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
          {language === 'es' ? 'Seleccionar Atleta' : 'Select Athlete'}
        </label>
        <select
          value={selectedAthlete}
          onChange={(e) => setSelectedAthlete(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36]"
        >
          <option value="">
            {language === 'es' ? '-- Seleccionar --' : '-- Select --'}
          </option>
          {athletes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.full_name} {a.is_elite ? '⭐' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Athlete Details */}
      {athlete && (
        <>
          {/* Elite Status Toggle */}
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Star
                  className={`w-6 h-6 ${athlete.is_elite ? 'text-[#fdda36]' : 'text-gray-400'}`}
                  fill={athlete.is_elite ? '#fdda36' : 'none'}
                />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white dark:text-white">
                    {language === 'es' ? 'Estado Elite' : 'Elite Status'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                    {athlete.is_elite
                      ? language === 'es'
                        ? 'Este atleta es Elite'
                        : 'This athlete is Elite'
                      : language === 'es'
                      ? 'Este atleta no es Elite'
                      : 'This athlete is not Elite'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleToggleEliteStatus}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  athlete.is_elite
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    : 'bg-[#fdda36] text-[#514163] hover:bg-[#ffd51a]'
                }`}
              >
                {athlete.is_elite
                  ? language === 'es'
                    ? 'Remover Elite'
                    : 'Remove Elite'
                  : language === 'es'
                  ? 'Hacer Elite'
                  : 'Make Elite'}
              </button>
            </div>
          </div>

          {/* Brand Messages (Elite Only) */}
          {athlete.is_elite && (
            <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white dark:text-white">
                  {language === 'es' ? 'Mensajes de Marcas' : 'Brand Messages'}
                </h3>
                <button
                  onClick={() => setShowBrandMessageForm(!showBrandMessageForm)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#fdda36] text-[#514163] rounded-lg font-semibold hover:bg-[#ffd51a] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {language === 'es' ? 'Agregar' : 'Add'}
                </button>
              </div>

              {showBrandMessageForm && (
                <div className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 rounded-lg p-4 mb-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                      {language === 'es' ? 'Nombre de la Marca' : 'Brand Name'}
                    </label>
                    <input
                      type="text"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-800 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                      {language === 'es' ? 'Mensaje' : 'Message'}
                    </label>
                    <textarea
                      value={brandMessage}
                      onChange={(e) => setBrandMessage(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-800 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                      {language === 'es' ? 'Detalles de la Oferta' : 'Offer Details'}
                    </label>
                    <input
                      type="text"
                      value={offerDetails}
                      onChange={(e) => setOfferDetails(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-800 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddBrandMessage}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-[#fdda36] text-[#514163] rounded-lg font-semibold hover:bg-[#ffd51a] transition-colors disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {saving
                        ? language === 'es'
                          ? 'Guardando...'
                          : 'Saving...'
                        : language === 'es'
                        ? 'Guardar'
                        : 'Save'}
                    </button>
                    <button
                      onClick={() => setShowBrandMessageForm(false)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-800 transition-colors"
                    >
                      {language === 'es' ? 'Cancelar' : 'Cancel'}
                    </button>
                  </div>
                </div>
              )}

              {athlete.brand_messages && athlete.brand_messages.length > 0 ? (
                <div className="space-y-2">
                  {athlete.brand_messages.map((msg: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 rounded-lg"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white dark:text-white">
                          {msg.brand_name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">{msg.message}</p>
                        {msg.offer_details && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
                            {msg.offer_details}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveBrandMessage(index)}
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400 text-center py-4">
                  {language === 'es'
                    ? 'No hay mensajes de marcas'
                    : 'No brand messages'}
                </p>
              )}
            </div>
          )}

          {/* Partner Discounts */}
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white dark:text-white flex items-center gap-2">
                <Gift className="w-5 h-5 text-[#fdda36]" />
                {language === 'es' ? 'Descuentos de Marcas Aliadas' : 'Partner Brand Discounts'}
              </h3>
              <button
                onClick={() => setShowDiscountForm(!showDiscountForm)}
                className="flex items-center gap-2 px-4 py-2 bg-[#fdda36] text-[#514163] rounded-lg font-semibold hover:bg-[#ffd51a] transition-colors"
              >
                <Plus className="w-4 h-4" />
                {language === 'es' ? 'Agregar' : 'Add'}
              </button>
            </div>

            {showDiscountForm && (
              <div className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 rounded-lg p-4 mb-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    {language === 'es' ? 'Nombre de la Marca' : 'Brand Name'}
                  </label>
                  <input
                    type="text"
                    value={discountBrandName}
                    onChange={(e) => setDiscountBrandName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-800 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    {language === 'es' ? 'Código de Descuento' : 'Discount Code'}
                  </label>
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-800 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    {language === 'es' ? 'Descripción' : 'Description'}
                  </label>
                  <textarea
                    value={discountDescription}
                    onChange={(e) => setDiscountDescription(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-800 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {language === 'es' ? 'Fecha de Expiración (Opcional)' : 'Expiration Date (Optional)'}
                  </label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-800 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddDiscount}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-[#fdda36] text-[#514163] rounded-lg font-semibold hover:bg-[#ffd51a] transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving
                      ? language === 'es'
                        ? 'Guardando...'
                        : 'Saving...'
                      : language === 'es'
                      ? 'Guardar'
                      : 'Save'}
                  </button>
                  <button
                    onClick={() => setShowDiscountForm(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-800 transition-colors"
                  >
                    {language === 'es' ? 'Cancelar' : 'Cancel'}
                  </button>
                </div>
              </div>
            )}

            {athlete.partner_discounts && athlete.partner_discounts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {athlete.partner_discounts.map((discount: any, index: number) => (
                  <div
                    key={index}
                    className="relative p-3 bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 dark:border-gray-700"
                  >
                    <button
                      onClick={() => handleRemoveDiscount(index)}
                      className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <h4 className="font-semibold text-gray-900 dark:text-white dark:text-white mb-1">
                      {discount.brand_name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-2">
                      {discount.description}
                    </p>
                    <code className="text-xs px-2 py-1 bg-[#fdda36]/20 text-[#514163] dark:text-[#fdda36] font-mono rounded">
                      {discount.discount_code}
                    </code>
                    {discount.expires_at && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-2">
                        {language === 'es' ? 'Expira:' : 'Expires:'}{' '}
                        {new Date(discount.expires_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400 text-center py-4">
                {language === 'es' ? 'No hay descuentos' : 'No discounts'}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
