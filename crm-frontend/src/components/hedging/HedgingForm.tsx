import { UseFormReturn } from 'react-hook-form';
import { Loader2, Search, ChevronDown, Clock, Settings2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface HedgingFormProps {
  form: UseFormReturn<any>;
  onSubmit: (values: any) => void;
  isLoading: boolean;
}

export function HedgingForm({ form, onSubmit, isLoading }: HedgingFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const accountIdsValue = form.watch('account_ids') || '';
  const accountCount = useMemo(() => {
    return accountIdsValue
      .split(/[\n,\s]+/)
      .map((id: string) => id.trim())
      .filter((id: string) => id && /^\d+$/.test(id)).length;
  }, [accountIdsValue]);

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-4 space-y-1">
        <CardTitle className="text-xl">Bulk Detection</CardTitle>
        <CardDescription className="text-sm">
          Analyze multiple accounts for hedging patterns (opposite-side trades on same symbol within time window)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Account IDs */}
            <FormField
              control={form.control}
              name="account_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Account IDs</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Textarea
                        placeholder="Enter MT5 account IDs (one per line or comma-separated)&#10;&#10;Example:&#10;12345678&#10;87654321"
                        className="min-h-[140px] font-mono text-sm resize-none pr-20 bg-muted/30 border-muted-foreground/20 focus:border-primary/50"
                        {...field}
                      />
                      <div className="absolute bottom-3 right-3 text-xs font-medium bg-background/90 backdrop-blur-sm px-2.5 py-1.5 rounded-md border shadow-sm">
                        <span className={cn(
                          "font-bold",
                          accountCount > 0 ? "text-primary" : "text-muted-foreground"
                        )}>
                          {accountCount}
                        </span>
                        <span className="text-muted-foreground ml-1">
                          account{accountCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription className="text-xs">
                    Enter 1–500 numeric MT5 account IDs
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Range */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="h-4 w-4" />
                Date Range
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date_from"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">From</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select start date & time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date_to"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">To</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select end date & time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Advanced Options */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  type="button" 
                  className="flex items-center gap-2 px-0 hover:bg-transparent text-muted-foreground hover:text-foreground h-auto py-2"
                >
                  <Settings2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Advanced Options</span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", showAdvanced && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-muted-foreground/10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="window_seconds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Time Window (seconds)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={60}
                              className="bg-background"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 5)}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Match trades within this window (1–60s)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="min_pairs"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Minimum Pairs</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={100000}
                              className="bg-background"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Minimum hedging pairs to flag account
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="max_pairs_per_account"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Max Pairs Per Account</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={200}
                              className="bg-background"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 50)}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Limit pairs returned per account
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="include_trades"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-background p-4 h-full">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">Include Trade Details</FormLabel>
                            <FormDescription className="text-xs">
                              Return individual hedging pairs
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Submit */}
            <Button type="submit" disabled={isLoading} size="lg" className="w-full sm:w-auto">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Detect Hedging
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
