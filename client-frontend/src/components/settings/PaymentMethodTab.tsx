import React, { useState, useEffect } from 'react';
import { Plus, CreditCard, Building, Coins, Trash2, Edit3, Zap } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { fetchUserProfileSettings, updateUserProfileSettings, UserProfileSettings, ClientPaymentMethod } from '@/utils/api';

export const PaymentMethodTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [formData, setFormData] = useState<UserProfileSettings | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMethod, setEditingMethod] = useState<ClientPaymentMethod | null>(null);
  const [newMethod, setNewMethod] = useState<Partial<ClientPaymentMethod>>({
    payment_type: 'rise',
    is_default: false
  });

  useEffect(() => {
    loadProfileSettings();
  }, []);

  const loadProfileSettings = async () => {
    try {
      setLoading(true);
      const data = await fetchUserProfileSettings();
      setFormData(data);
    } catch (error) {
      console.error('Failed to load profile settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMethod = async () => {
    if (!formData || !newMethod.payment_type) return;

    const updatedMethods = [...(formData.payment_methods || []), newMethod as ClientPaymentMethod];
    
    try {
      setUpdating(true);
      await updateUserProfileSettings({ payment_methods: updatedMethods });
      setFormData(prev => ({
        ...prev!,
        payment_methods: updatedMethods
      }));
      setShowAddForm(false);
      setNewMethod({ payment_type: 'rise', is_default: false });
    } catch (error) {
      console.error('Failed to add payment method:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteMethod = async (methodId: string) => {
    if (!formData) return;

    const updatedMethods = formData.payment_methods.filter(method => method.id !== methodId);
    
    try {
      setUpdating(true);
      await updateUserProfileSettings({ payment_methods: updatedMethods });
      setFormData(prev => ({
        ...prev!,
        payment_methods: updatedMethods
      }));
    } catch (error) {
      console.error('Failed to delete payment method:', error);
    } finally {
      setUpdating(false);
    }
  };

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case 'rise':
        return <Zap size={20} className="text-[#4EC1FF]" />;
      case 'crypto':
        return <Coins size={20} className="text-[#4EC1FF]" />;
      default:
        return <CreditCard size={20} className="text-[#4EC1FF]" />;
    }
  };

  const getPaymentLabel = (method: ClientPaymentMethod) => {
    switch (method.payment_type) {
      case 'rise':
        return method.rise_email || 'Rise Account';
      case 'crypto':
        return `${method.crypto_type?.toUpperCase()} Wallet` || 'Crypto Wallet';
      default:
        return 'Payment Method';
    }
  };

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-8">
        <div className="text-[#85A8C3]">Loading payment methods...</div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="w-full flex items-center justify-center py-8">
        <div className="text-[#85A8C3]">Failed to load payment methods</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-medium text-[#E4EEF5]">Payment Methods</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#4EC1FF] text-[#E4EEF5] font-medium rounded-lg hover:bg-[#3AB3FF] transition-colors"
        >
          <Plus size={20} />
          Add Method
        </button>
      </div>

      {/* Payment Methods List */}
      <div className="space-y-4 mb-8">
        {formData.payment_methods?.map((method) => (
          <div key={method.id} className="bg-[#0A1016] border border-[#23353E] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getPaymentIcon(method.payment_type)}
                <div>
                  <h3 className="text-[#E4EEF5] font-medium">{getPaymentLabel(method)}</h3>
                  <p className="text-sm text-[#85A8C3]">
                    {method.label || method.payment_type.charAt(0).toUpperCase() + method.payment_type.slice(1)}
                    {method.is_default && <span className="ml-2 text-[#4EC1FF]">(Default)</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingMethod(method)}
                  className="p-2 text-[#85A8C3] hover:text-[#E4EEF5] transition-colors"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  onClick={() => handleDeleteMethod(method.id)}
                  disabled={updating}
                  className="p-2 text-[#85A8C3] hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {(!formData.payment_methods || formData.payment_methods.length === 0) && (
          <div className="text-center py-8 text-[#85A8C3]">
            No payment methods added yet. Click "Add Method" to get started.
          </div>
        )}
      </div>

      {/* Add New Method Form */}
      {showAddForm && (
        <div className="bg-[#0A1016] border border-[#23353E] rounded-lg p-6">
          <h3 className="text-lg font-medium text-[#E4EEF5] mb-4">Add Payment Method</h3>
          
          <div className="space-y-4">
            {/* Payment Type */}
            <div>
              <label className="block text-sm font-medium text-[#85A8C3] mb-2">Payment Type</label>
              <select
                value={newMethod.payment_type}
                onChange={(e) => setNewMethod(prev => ({ ...prev, payment_type: e.target.value as any }))}
                className="w-full px-4 py-3 bg-[#101A1F] border border-[#23353E] rounded-lg text-[#E4EEF5] focus:outline-none focus:ring-1 focus:ring-[#4EC1FF] focus:border-transparent"
              >
                <option value="rise">Rise Payout</option>
                <option value="crypto">Crypto Wallet</option>
              </select>
            </div>

            {/* Rise Fields */}
            {newMethod.payment_type === 'rise' && (
              <div>
                <label className="block text-sm font-medium text-[#85A8C3] mb-2">Rise Account Email</label>
                <input
                  type="email"
                  value={newMethod.rise_email || ''}
                  onChange={(e) => setNewMethod(prev => ({ ...prev, rise_email: e.target.value }))}
                  className="w-full px-4 py-3 bg-[#101A1F] border border-[#23353E] rounded-lg text-[#E4EEF5] placeholder-[#85A8C3] focus:outline-none focus:ring-1 focus:ring-[#4EC1FF] focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>
            )}

            {/* Crypto Fields */}
            {newMethod.payment_type === 'crypto' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-[#85A8C3] mb-2">Crypto Type</label>
                  <select
                    value={newMethod.crypto_type || ''}
                    onChange={(e) => setNewMethod(prev => ({ ...prev, crypto_type: e.target.value as any }))}
                    className="w-full px-4 py-3 bg-[#101A1F] border border-[#23353E] rounded-lg text-[#E4EEF5] focus:outline-none focus:ring-1 focus:ring-[#4EC1FF] focus:border-transparent"
                  >
                    <option value="">Select crypto type</option>
                    <option value="usdt_trc20">USDT - TRC20</option>
                    <option value="usdt_erc20">USDT - ERC20</option>
                    <option value="usdc_erc20">USDC - ERC20</option>
                    <option value="btc">Bitcoin (BTC)</option>
                    <option value="eth">Ethereum (ETH)</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#85A8C3] mb-2">Wallet Address</label>
                  <input
                    type="text"
                    value={newMethod.crypto_wallet_address || ''}
                    onChange={(e) => setNewMethod(prev => ({ ...prev, crypto_wallet_address: e.target.value }))}
                    className="w-full px-4 py-3 bg-[#101A1F] border border-[#23353E] rounded-lg text-[#E4EEF5] placeholder-[#85A8C3] focus:outline-none focus:ring-1 focus:ring-[#4EC1FF] focus:border-transparent"
                  />
                </div>
              </>
            )}

            {/* Label */}
            <div>
              <label className="block text-sm font-medium text-[#85A8C3] mb-2">Label (Optional)</label>
              <input
                type="text"
                value={newMethod.label || ''}
                onChange={(e) => setNewMethod(prev => ({ ...prev, label: e.target.value }))}
                className="w-full px-4 py-3 bg-[#101A1F] border border-[#23353E] rounded-lg text-[#E4EEF5] placeholder-[#85A8C3] focus:outline-none focus:ring-1 focus:ring-[#4EC1FF] focus:border-transparent"
                placeholder="e.g., My Main Bank Account"
              />
            </div>

            {/* Default toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="isDefault" className="text-sm text-[#E4EEF5]">
                Set as default payment method
              </Label>
              <Switch
                id="isDefault"
                checked={newMethod.is_default || false}
                onCheckedChange={(checked) => setNewMethod(prev => ({ ...prev, is_default: checked }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-[#85A8C3] hover:text-[#E4EEF5] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddMethod}
              disabled={updating}
              className="px-6 py-2 bg-[#4EC1FF] text-[#E4EEF5] font-medium rounded-lg hover:bg-[#3AB3FF] transition-colors disabled:opacity-50"
            >
              {updating ? 'Adding...' : 'Add Method'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
