import { UseFormReturn } from 'react-hook-form';
import { Loader2, Search, ChevronDown, Clock, Settings2, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface HedgingFindSimilarFormProps {
  form: UseFormReturn<any>;
  onSubmit: (values: any) => void;
  isLoading: boolean;
}

export function HedgingFindSimilarForm({ form, onSubmit, isLoading }: HedgingFindSimilarFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-4 space-y-1">
        <CardTitle className="text-xl flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Find Similar Accounts
        </CardTitle>
        <CardDescription className="text-sm">
          Identify accounts with hedging patterns similar to a seed account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Seed Account ID */}
            <FormField
              control={form.control}
              name="seed_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Seed Account ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter MT5 account ID (e.g., 12345678)"
                      className="font-mono bg-muted/30 border-muted-foreground/20 focus:border-primary/50"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    The reference account to find similar hedging patterns
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                            Match trades within this window
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="min_matches"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Minimum Matches</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={100000}
                              className="bg-background"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 2)}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Min overlapping hedging events
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="max_results"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Max Results</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={200}
                              className="bg-background"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 20)}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Maximum accounts to return
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="max_evidence_per_account"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Max Evidence Per Account</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={100}
                              className="bg-background"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 20)}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Limit evidence pairs per account
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="include_evidence"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-background p-4 h-full">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">Include Evidence</FormLabel>
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
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Find Similar Accounts
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
