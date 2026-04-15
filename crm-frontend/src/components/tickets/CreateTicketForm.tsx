
import React from 'react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle } from 'lucide-react';

interface CreateTicketFormProps {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

const CreateTicketForm: React.FC<CreateTicketFormProps> = ({ onSubmit }) => {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button className="flex gap-2 items-center">
          <PlusCircle size={16} />
          <span>Create Ticket</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <form onSubmit={onSubmit}>
          <DrawerHeader>
            <DrawerTitle>Create New Support Ticket</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 py-2 space-y-4">
            <div className="grid w-full gap-1.5">
              <Label htmlFor="requester_name">Customer Name</Label>
              <Input 
                type="text"
                name="requester_name"
                id="requester_name"
                placeholder="John Doe" 
                required
              />
            </div>
            <div className="grid w-full gap-1.5">
              <Label htmlFor="requester_email">Customer Email</Label>
              <Input 
                type="email"
                name="requester_email"
                id="requester_email"
                placeholder="trader@example.com" 
                required
              />
            </div>
            <div className="grid w-full gap-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input 
                type="text"
                name="subject"
                id="subject"
                placeholder="Brief description of the issue" 
                required
              />
            </div>
            <div className="grid w-full gap-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                name="description"
                id="description"
                placeholder="Detailed information about the issue" 
                rows={5}
                required
              />
            </div>
            <div className="grid w-full gap-1.5">
              <Label htmlFor="priority">Priority</Label>
              <Select name="priority" defaultValue="medium">
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DrawerFooter>
            <Button type="submit">Create Ticket</Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
};

export default CreateTicketForm;
