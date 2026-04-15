import React from 'react';
import { FormField } from './FormField';
import { SelectField } from './SelectField';

interface CalculatorFormData {
  instrument: string;
  depositCurrency: string;
  stopLossPips: string;
  depositAmount: string;
  pipSize: string;
  risk: string;
  platform: string;
  usdCadPrice: string;
  contractSize: string;
}

interface CalculatorFormProps {
  formData: CalculatorFormData;
  onFormDataChange: (data: CalculatorFormData) => void;
}

export const CalculatorForm: React.FC<CalculatorFormProps> = ({
  formData,
  onFormDataChange
}) => {
  const instrumentOptions = [
    { value: 'AUDCAD', label: 'AUD/CAD' },
    { value: 'EURUSD', label: 'EUR/USD' },
    { value: 'GBPUSD', label: 'GBP/USD' },
    { value: 'USDJPY', label: 'USD/JPY' }
  ];

  const currencyOptions = [
    { value: 'USD', label: 'US Dollar' },
    { value: 'EUR', label: 'Euro' },
    { value: 'GBP', label: 'British Pound' },
    { value: 'JPY', label: 'Japanese Yen' }
  ];

  const platformOptions = [
    { value: 'MT5', label: 'MetaTrader 5' },
    { value: 'MT4', label: 'MetaTrader 4' },
    { value: 'CTRADER', label: 'cTrader' }
  ];

  const updateField = (field: keyof CalculatorFormData, value: string) => {
    onFormDataChange({
      ...formData,
      [field]: value
    });
  };

  return (
    <form className="w-full font-medium leading-6 max-md:max-w-full">
      <fieldset className="flex w-full gap-4 flex-wrap max-md:max-w-full">
        <legend className="sr-only">Trading Instrument and Currency</legend>
        <SelectField
          label="Instrument"
          value={formData.instrument}
          onChange={(value) => updateField('instrument', value)}
          options={instrumentOptions}
        />
        <SelectField
          label="Deposit currency"
          value={formData.depositCurrency}
          onChange={(value) => updateField('depositCurrency', value)}
          options={currencyOptions}
        />
      </fieldset>

      <fieldset className="flex w-full gap-4 flex-wrap mt-8 max-md:max-w-full">
        <legend className="sr-only">Stop Loss and Deposit Amount</legend>
        <FormField
          label="Stop Loss (Pips)"
          value={formData.stopLossPips}
          onChange={(value) => updateField('stopLossPips', value)}
          type="number"
          placeholder="200"
        />
        <FormField
          label="Deposit amount"
          value={formData.depositAmount}
          onChange={(value) => updateField('depositAmount', value)}
          type="number"
          placeholder="100000"
        />
      </fieldset>

      <fieldset className="flex w-full gap-4 flex-wrap mt-8 max-md:max-w-full">
        <legend className="sr-only">Pip Size and Risk Settings</legend>
        <FormField
          label="AUD/CAD 1 Pip Size"
          value={formData.pipSize}
          onChange={(value) => updateField('pipSize', value)}
          placeholder="MetaTrader 5"
        />
        <FormField
          label="Risk"
          value={formData.risk}
          onChange={(value) => updateField('risk', value)}
          placeholder="MetaTrader 5"
        />
        <SelectField
          label="Platform"
          value={formData.platform}
          onChange={(value) => updateField('platform', value)}
          options={platformOptions}
        />
      </fieldset>

      <fieldset className="flex w-full gap-4 flex-wrap mt-8 max-md:max-w-full">
        <legend className="sr-only">Price and Contract Information</legend>
        <FormField
          label="USD/CAD Price"
          value={formData.usdCadPrice}
          onChange={(value) => updateField('usdCadPrice', value)}
          type="number"
          placeholder="1.34356"
        />
        <FormField
          label="Contract Size (Unit per Lot)"
          value={formData.contractSize}
          onChange={(value) => updateField('contractSize', value)}
          type="number"
          placeholder="100000"
        />
      </fieldset>
    </form>
  );
};
