
import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { challengeService, ChallengeProduct } from '@/services/challengeService';
import { toast } from '@/hooks/use-toast';

interface FormData {
  name: string;
  challenge_type: 'one_step' | 'two_step';
  account_size: number;
  entry_fee: number;
  max_daily_loss: number;
  max_total_loss: number;
  profit_target_phase_1: number;
  profit_target_phase_2: number | null;
  rules: Record<string, any>;
  is_active: boolean;
}

interface ChallengeProductFormProps {
  product?: ChallengeProduct;
  onSuccess: () => void;
}

const ChallengeProductForm: React.FC<ChallengeProductFormProps> = ({ product, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [rulesText, setRulesText] = React.useState(
    product?.rules ? JSON.stringify(product.rules, null, 2) : ''
  );
  const isEditing = !!product;

  const form = useForm<FormData>({
    defaultValues: {
      name: product?.name || '',
      challenge_type: product?.challenge_type || 'two_step',
      account_size: product?.account_size || 10000,
      entry_fee: product?.entry_fee || 99,
      max_daily_loss: product?.max_daily_loss || 5,
      max_total_loss: product?.max_total_loss || 10,
      profit_target_phase_1: product?.profit_target_phase_1 || 8,
      profit_target_phase_2: product?.profit_target_phase_2 || 5,
      rules: product?.rules || {},
      is_active: product?.is_active ?? true,
    },
  });

  const challengeType = form.watch('challenge_type');

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      // Parse rules from JSON text
      let parsedRules = {};
      if (rulesText.trim()) {
        try {
          parsedRules = JSON.parse(rulesText);
        } catch (e) {
          toast({
            title: 'Error',
            description: 'Invalid JSON format in rules field',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }
      }

      const submitData = {
        ...data,
        profit_target_phase_2: data.challenge_type === 'one_step' ? null : data.profit_target_phase_2,
        rules: parsedRules,
      };

      if (isEditing) {
        await challengeService.updateChallengeProduct(product.id, submitData);
      } else {
        await challengeService.createChallengeProduct(submitData);
      }

      toast({
        title: 'Success',
        description: `Challenge product ${isEditing ? 'updated' : 'created'} successfully`,
      });

      onSuccess();
    } catch (error) {
      console.error('Error saving challenge product:', error);
      toast({
        title: 'Error',
        description: `Failed to ${isEditing ? 'update' : 'create'} challenge product`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 1-Step - $10,000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="challenge_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Challenge Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select challenge type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="one_step">1-Step</SelectItem>
                  <SelectItem value="two_step">2-Step</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="account_size"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Size ($)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="10000"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="entry_fee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Entry Fee ($)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="99"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="max_daily_loss"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Daily Loss ($)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder="500"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="max_total_loss"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Total Loss ($)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder="1000"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="profit_target_phase_1"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phase 1 Profit Target ($)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder="800"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {challengeType === 'two_step' && (
            <FormField
              control={form.control}
              name="profit_target_phase_2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phase 2 Profit Target ($)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="500"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div>
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Rules (JSON)
          </label>
          <Textarea 
            placeholder='{"min_trading_days": 4, "max_position_size": 0.02}'
            className="min-h-[100px] mt-2"
            value={rulesText}
            onChange={(e) => setRulesText(e.target.value)}
          />
        </div>

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Make this challenge product available for purchase
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ChallengeProductForm;
