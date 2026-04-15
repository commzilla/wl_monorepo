 import { useState } from 'react';
 import { UseFormReturn, FieldValues } from 'react-hook-form';
 import { format } from 'date-fns';
 import { Search, ChevronDown, ChevronUp, Loader2, CalendarIcon, Info } from 'lucide-react';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Switch } from '@/components/ui/switch';
 import { Textarea } from '@/components/ui/textarea';
 import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
 import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
 import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
 import { Calendar } from '@/components/ui/calendar';
 import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
 import { cn } from '@/lib/utils';
 
 interface CopyTradingFormProps<T extends FieldValues> {
   form: UseFormReturn<T>;
   onSubmit: (values: T) => void;
   isLoading: boolean;
 }
 
 export function CopyTradingForm<T extends FieldValues>({ form, onSubmit, isLoading }: CopyTradingFormProps<T>) {
   const [showAdvanced, setShowAdvanced] = useState(false);
 
   // Count valid account IDs
   const accountIdsValue = (form.watch('account_ids' as any) as string) || '';
   const validAccountCount = accountIdsValue
     .split(/[\n,\s]+/)
     .map(id => id.trim())
     .filter(id => id && /^\d+$/.test(id)).length;
 
   return (
     <Card className="border-border/50">
       <CardHeader className="pb-4">
         <div className="flex items-center gap-3">
           <div className="p-2 rounded-lg bg-primary/10">
             <Search className="h-5 w-5 text-primary" />
           </div>
           <div>
             <CardTitle>Detection Parameters</CardTitle>
             <CardDescription className="mt-1">
               Enter account IDs to analyze for copy trading patterns
             </CardDescription>
           </div>
         </div>
       </CardHeader>
       <CardContent>
         <Form {...form}>
           <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
             {/* Account IDs Input */}
               <FormField
                 control={form.control}
                 name={"account_ids" as any}
               render={({ field }) => (
                 <FormItem>
                   <div className="flex items-center justify-between">
                     <FormLabel className="flex items-center gap-2">
                       Account IDs
                       <span className="text-destructive">*</span>
                     </FormLabel>
                     <span className={cn(
                       'text-xs font-medium px-2 py-0.5 rounded-full',
                       validAccountCount >= 2
                         ? 'bg-green-500/10 text-green-500'
                         : 'bg-muted text-muted-foreground'
                     )}>
                       {validAccountCount} account{validAccountCount !== 1 ? 's' : ''} detected
                     </span>
                   </div>
                   <FormControl>
                     <Textarea
                       placeholder="Enter account IDs (one per line, comma, or space separated)&#10;&#10;Example:&#10;123456&#10;789012, 345678&#10;901234"
                       className="min-h-[140px] font-mono text-sm resize-none"
                       {...field}
                     />
                   </FormControl>
                   <FormDescription>
                     Minimum 2, maximum 500 account IDs. Numeric only.
                   </FormDescription>
                   <FormMessage />
                 </FormItem>
               )}
             />
 
             {/* Date Range */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                 control={form.control}
                 name={"date_from" as any}
                 render={({ field }) => (
                   <FormItem className="flex flex-col">
                     <FormLabel className="flex items-center gap-2">
                       Date From
                       <TooltipProvider>
                         <Tooltip>
                           <TooltipTrigger asChild>
                             <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                           </TooltipTrigger>
                           <TooltipContent>
                             <p>Leave empty to scan from 24 hours ago</p>
                           </TooltipContent>
                         </Tooltip>
                       </TooltipProvider>
                     </FormLabel>
                     <Popover>
                       <PopoverTrigger asChild>
                         <FormControl>
                           <Button
                             variant="outline"
                             className={cn(
                               'w-full justify-start text-left font-normal',
                               !field.value && 'text-muted-foreground'
                             )}
                           >
                             <CalendarIcon className="mr-2 h-4 w-4" />
                             {field.value ? format(new Date(field.value), 'PPP HH:mm') : 'Last 24 hours'}
                           </Button>
                         </FormControl>
                       </PopoverTrigger>
                       <PopoverContent className="w-auto p-0" align="start">
                         <Calendar
                           mode="single"
                           selected={field.value ? new Date(field.value) : undefined}
                           onSelect={(date) => {
                             if (date) {
                               field.onChange(date.toISOString());
                             } else {
                               field.onChange(undefined);
                             }
                           }}
                           initialFocus
                           className="pointer-events-auto"
                         />
                         {field.value && (
                           <div className="p-3 border-t">
                             <Button
                               variant="ghost"
                               size="sm"
                               className="w-full"
                               onClick={() => field.onChange(undefined)}
                             >
                               Clear date
                             </Button>
                           </div>
                         )}
                       </PopoverContent>
                     </Popover>
                     <FormMessage />
                   </FormItem>
                 )}
               />
 
               <FormField
                 control={form.control}
                 name={"date_to" as any}
                 render={({ field }) => (
                   <FormItem className="flex flex-col">
                     <FormLabel className="flex items-center gap-2">
                       Date To
                       <TooltipProvider>
                         <Tooltip>
                           <TooltipTrigger asChild>
                             <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                           </TooltipTrigger>
                           <TooltipContent>
                             <p>Leave empty to scan until now</p>
                           </TooltipContent>
                         </Tooltip>
                       </TooltipProvider>
                     </FormLabel>
                     <Popover>
                       <PopoverTrigger asChild>
                         <FormControl>
                           <Button
                             variant="outline"
                             className={cn(
                               'w-full justify-start text-left font-normal',
                               !field.value && 'text-muted-foreground'
                             )}
                           >
                             <CalendarIcon className="mr-2 h-4 w-4" />
                             {field.value ? format(new Date(field.value), 'PPP HH:mm') : 'Current time'}
                           </Button>
                         </FormControl>
                       </PopoverTrigger>
                       <PopoverContent className="w-auto p-0" align="start">
                         <Calendar
                           mode="single"
                           selected={field.value ? new Date(field.value) : undefined}
                           onSelect={(date) => {
                             if (date) {
                               field.onChange(date.toISOString());
                             } else {
                               field.onChange(undefined);
                             }
                           }}
                           initialFocus
                           className="pointer-events-auto"
                         />
                         {field.value && (
                           <div className="p-3 border-t">
                             <Button
                               variant="ghost"
                               size="sm"
                               className="w-full"
                               onClick={() => field.onChange(undefined)}
                             >
                               Clear date
                             </Button>
                           </div>
                         )}
                       </PopoverContent>
                     </Popover>
                     <FormMessage />
                   </FormItem>
                 )}
               />
             </div>
 
             {/* Core Parameters */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                 control={form.control}
                 name={"window_seconds" as any}
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Time Window (seconds)</FormLabel>
                     <FormControl>
                       <Input
                         type="number"
                         min={1}
                         max={60}
                         {...field}
                         onChange={e => field.onChange(parseInt(e.target.value) || 5)}
                       />
                     </FormControl>
                     <FormDescription>
                       Trades within this window are considered matches (1-60)
                     </FormDescription>
                     <FormMessage />
                   </FormItem>
                 )}
               />
 
               <FormField
                 control={form.control}
                 name={"min_accounts" as any}
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Minimum Accounts</FormLabel>
                     <FormControl>
                       <Input
                         type="number"
                         min={2}
                         max={20}
                         {...field}
                         onChange={e => field.onChange(parseInt(e.target.value) || 2)}
                       />
                     </FormControl>
                     <FormDescription>
                       Minimum accounts to form a cluster (2-20)
                     </FormDescription>
                     <FormMessage />
                   </FormItem>
                 )}
               />
             </div>
 
             {/* Advanced Options */}
             <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
               <CollapsibleTrigger asChild>
                 <Button variant="ghost" type="button" className="gap-2 text-muted-foreground hover:text-foreground">
                   {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                   Advanced Options
                 </Button>
               </CollapsibleTrigger>
               <CollapsibleContent className="space-y-4 pt-4">
                 <div className="rounded-lg border border-dashed p-4 space-y-4 bg-muted/20">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField
                       control={form.control}
                       name={"volume_tolerance_ratio" as any}
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>Volume Tolerance Ratio</FormLabel>
                           <FormControl>
                             <Input
                               type="number"
                               step="0.1"
                               min={0}
                               max={5}
                               placeholder="e.g., 0.1 for ±10%"
                               {...field}
                               value={field.value ?? ''}
                               onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                             />
                           </FormControl>
                           <FormDescription>
                             Only match if volumes are within this ratio (optional)
                           </FormDescription>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
 
                     <FormField
                       control={form.control}
                       name={"max_trades_per_cluster" as any}
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>Max Trades per Cluster</FormLabel>
                           <FormControl>
                             <Input
                               type="number"
                               min={1}
                               max={200}
                               {...field}
                               onChange={e => field.onChange(parseInt(e.target.value) || 50)}
                             />
                           </FormControl>
                           <FormDescription>
                             Limit trades shown per cluster (1-200)
                           </FormDescription>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
                   </div>
 
                   <FormField
                     control={form.control}
                     name={"include_trades" as any}
                     render={({ field }) => (
                       <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-background p-4">
                         <div className="space-y-0.5">
                           <FormLabel className="text-base">Include Trade Details</FormLabel>
                           <FormDescription>
                             Show individual trades in each cluster
                           </FormDescription>
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
                 </div>
               </CollapsibleContent>
             </Collapsible>
 
             {/* Submit Button */}
             <Button type="submit" disabled={isLoading} size="lg" className="w-full md:w-auto">
               {isLoading ? (
                 <>
                   <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                   Analyzing...
                 </>
               ) : (
                 <>
                   <Search className="h-4 w-4 mr-2" />
                   Detect Copy Trading
                 </>
               )}
             </Button>
           </form>
         </Form>
       </CardContent>
     </Card>
   );
 }