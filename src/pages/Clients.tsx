
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Form,
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel,
  FormMessage 
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Edit,
  Filter,
  ListFilter,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  SlidersHorizontal,
  CheckSquare,
  Tag,
  CalendarDays,
  DollarSign,
  Calendar,
  Map,
  Users,
  Check,
  Minus,
  Mail,
  MessageSquare,
  FileText,
  UserX,
  UserCheck,
  Printer,
  CircleDot,
  Columns3,
  MoveVertical,
  Import,
  FileText as FileIcon,
  SearchCode,
} from "lucide-react";
import { Client, ClientType, mockClients } from "@/data/mockData";
import { Link } from "react-router-dom";
import { formatPhoneNumber } from "@/lib/utils";
import { ClientFilters } from "@/components/clients/ClientFilters";
import { ClientQuickView } from "@/components/clients/ClientQuickView";
import { ClientBulkActions } from "@/components/clients/ClientBulkActions";
import { ClientColumnSelector } from "@/components/clients/ClientColumnSelector";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ScheduleJobDialog } from "@/components/schedule/ScheduleJobDialog";

// Client status types
export type ClientStatus = "lead" | "prospect" | "active" | "on-hold" | "inactive" | "lost";

// Define available columns for customization
export type ClientColumn = 
  | "name" 
  | "contact" 
  | "address" 
  | "type" 
  | "status" 
  | "lastService" 
  | "nextService" 
  | "balance" 
  | "clientSince"
  | "assignedStaff";

// Define the client form schema
const clientFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  type: z.enum(["residential", "commercial"]),
  contactName: z.string().min(2, { message: "Contact name is required." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phone: z.string().min(10, { message: "Phone number is required." }),
  street: z.string().min(5, { message: "Street address is required." }),
  city: z.string().min(2, { message: "City is required." }),
  state: z.string().min(2, { message: "State is required." }),
  zipCode: z.string().min(5, { message: "Zip code is required." }),
  tags: z.string().optional(),
  status: z.enum(["lead", "prospect", "active", "on-hold", "inactive", "lost"]),
  notes: z.string().optional(),
});

// Define the client form values type
type ClientFormValues = z.infer<typeof clientFormSchema>;

const Clients = () => {
  const { toast } = useToast();
  const [filterType, setFilterType] = useState<ClientType | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  const [isAddClientDialogOpen, setIsAddClientDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ClientStatus>("active");
  const [localClients, setLocalClients] = useState(mockClients);
  
  // Function to handle status change
  const handleStatusChange = (status: ClientStatus) => {
    setSelectedStatus(status);
    toast({
      title: "Status changed",
      description: `Client status updated to ${status}`,
    });
  };
  
  // Form for adding new client
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      type: "residential",
      contactName: "",
      email: "",
      phone: "",
      street: "",
      city: "",
      state: "",
      zipCode: "",
      tags: "",
      status: "lead",
      notes: "",
    },
  });
  
  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<ClientColumn[]>([
    "name", "contact", "address", "type", "lastService"
  ]);

  // Saved views state
  const [savedViews, setSavedViews] = useState<{name: string, filters: any}[]>([
    { name: "All Clients", filters: { type: "all" } },
    { name: "Overdue Residential", filters: { type: "residential", status: "active", balance: "overdue" } }
  ]);
  
  // Advanced filters state
  const [advancedFilters, setAdvancedFilters] = useState({
    tags: [],
    status: "all",
    dateRange: { start: null, end: null },
    nextJobRange: { start: null, end: null },
    balanceStatus: "all",
    zipCodes: [],
    staff: []
  });

  // Filter clients based on all criteria
  const filteredClients = localClients.filter((client) => {
    // Filter by type
    if (filterType !== "all" && client.type !== filterType) {
      return false;
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      
      // Check if it's a field-specific search
      if (searchTerm.includes(':')) {
        const [field, value] = searchTerm.split(':');
        const valueLower = value.toLowerCase();
        
        switch (field.toLowerCase()) {
          case 'email':
            return client.contacts.some(contact => 
              contact.email.toLowerCase().includes(valueLower));
          case 'tag':
            return client.tags.some(tag => 
              tag.toLowerCase().includes(valueLower));
          case 'city':
            return client.addresses.some(address => 
              address.city.toLowerCase().includes(valueLower));
          default:
            // Default search behavior
            return (
              client.name.toLowerCase().includes(searchLower) ||
              client.contacts.some(
                (contact) =>
                  contact.name.toLowerCase().includes(searchLower) ||
                  contact.email.toLowerCase().includes(searchLower) ||
                  contact.phone.includes(searchTerm)
              ) ||
              client.addresses.some((address) =>
                address.street.toLowerCase().includes(searchLower)
              )
            );
        }
      }
      
      // Regular search across all fields
      return (
        client.name.toLowerCase().includes(searchLower) ||
        client.contacts.some(
          (contact) =>
            contact.name.toLowerCase().includes(searchLower) ||
            contact.email.toLowerCase().includes(searchLower) ||
            contact.phone.includes(searchTerm)
        ) ||
        client.addresses.some((address) =>
          address.street.toLowerCase().includes(searchLower)
        ) ||
        client.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    return true;
  });

  // Count clients by type
  const residentialCount = localClients.filter(
    (client) => client.type === "residential"
  ).length;
  const commercialCount = localClients.filter(
    (client) => client.type === "commercial"
  ).length;

  // Handle bulk selection
  const toggleSelectAll = () => {
    if (selectedClients.length === filteredClients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(filteredClients.map(client => client.id));
    }
  };

  const toggleClientSelection = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId) 
        : [...prev, clientId]
    );
  };

  // Open quick view panel
  const openQuickView = (client: Client) => {
    setSelectedClient(client);
    setIsQuickViewOpen(true);
  };

  // Handle applying saved view
  const applySavedView = (view: {name: string, filters: any}) => {
    // In a real app, this would set all the relevant filters
    setFilterType(view.filters.type);
    toast({
      title: "View Applied",
      description: `Applied the "${view.name}" view`,
    });
  };

  // Handle adding a new client
  const onSubmitNewClient = (data: ClientFormValues) => {
    console.log("Adding new client:", data);
    // Generate a unique ID
    const newId = `client-${Date.now()}`;
    
    // Create a new client object
    const newClient: Client = {
      id: newId,
      name: data.name,
      type: data.type,
      contacts: [
        {
          name: data.contactName,
          email: data.email,
          phone: data.phone,
          isPrimary: true,
        },
      ],
      addresses: [
        {
          street: data.street,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
        },
      ],
      tags: data.tags ? data.tags.split(',').map(tag => tag.trim()) : [],
      lastService: null,
      notes: data.notes || "",
      createdAt: new Date().toISOString(),
    };
    
    // Add the new client to the local state
    setLocalClients(prevClients => [newClient, ...prevClients]);
    
    // Reset the form and close the dialog
    form.reset();
    setIsAddClientDialogOpen(false);
    
    // Show success toast
    toast({
      title: "Client added",
      description: `${data.name} has been added successfully.`,
    });
  };

  return (
    <div className="space-y-6 py-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Manage your residential and commercial clients.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-1">
                <CircleDot className="h-4 w-4" color={
                  selectedStatus === "lead" ? "blue" : 
                  selectedStatus === "prospect" ? "indigo" :
                  selectedStatus === "active" ? "green" :
                  selectedStatus === "on-hold" ? "orange" :
                  selectedStatus === "inactive" ? "gray" : "red"
                } />
                {selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleStatusChange("lead")}>
                <CircleDot className="h-4 w-4 mr-2 text-blue-500" />
                Lead
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange("prospect")}>
                <CircleDot className="h-4 w-4 mr-2 text-indigo-500" />
                Prospect
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange("active")}>
                <CircleDot className="h-4 w-4 mr-2 text-green-500" />
                Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange("on-hold")}>
                <CircleDot className="h-4 w-4 mr-2 text-orange-500" />
                On Hold
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange("inactive")}>
                <CircleDot className="h-4 w-4 mr-2 text-gray-500" />
                Inactive
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange("lost")}>
                <CircleDot className="h-4 w-4 mr-2 text-red-500" />
                Lost
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Dialog open={isAddClientDialogOpen} onOpenChange={setIsAddClientDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                <span>Add New Client</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
                <DialogDescription>
                  Fill out the form below to add a new client to your system.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitNewClient)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter client name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Type</FormLabel>
                          <FormControl>
                            <select 
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              {...field}
                            >
                              <option value="residential">Residential</option>
                              <option value="commercial">Commercial</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter contact name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <FormControl>
                            <select 
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              {...field}
                            >
                              <option value="lead">Lead</option>
                              <option value="prospect">Prospect</option>
                              <option value="active">Active</option>
                              <option value="on-hold">On Hold</option>
                              <option value="inactive">Inactive</option>
                              <option value="lost">Lost</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="street"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter street address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter city" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter state" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Zip Code</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter zip code" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="tags"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tags (comma separated)</FormLabel>
                          <FormControl>
                            <Input placeholder="VIP, Monthly, Special Instructions" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Enter any additional notes here..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddClientDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Add Client</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Client Directory</CardTitle>
          <CardDescription>
            View and manage all your cleaning clients.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search and action bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search clients... (try email:john@ or tag:VIP)"
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => setIsFilterDrawerOpen(true)}
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <ListFilter className="h-4 w-4" />
                      Saved Views
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2">
                    <div className="space-y-1">
                      {savedViews.map((view, i) => (
                        <Button 
                          key={i} 
                          variant="ghost" 
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => applySavedView(view)}
                        >
                          {view.name}
                        </Button>
                      ))}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-2"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Save Current View
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
                <Popover open={isColumnSelectorOpen} onOpenChange={setIsColumnSelectorOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline">
                      <Columns3 className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2">
                    <ClientColumnSelector 
                      visibleColumns={visibleColumns}
                      setVisibleColumns={setVisibleColumns}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Type Filter Tabs */}
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid grid-cols-3 w-full sm:w-auto">
                <TabsTrigger value="all" onClick={() => setFilterType("all")}>
                  All ({mockClients.length})
                </TabsTrigger>
                <TabsTrigger
                  value="residential"
                  onClick={() => setFilterType("residential")}
                >
                  Residential ({residentialCount})
                </TabsTrigger>
                <TabsTrigger
                  value="commercial"
                  onClick={() => setFilterType("commercial")}
                >
                  Commercial ({commercialCount})
                </TabsTrigger>
              </TabsList>

              {/* Client List with Bulk Actions */}
              <TabsContent value="all" className="mt-4">
                <ClientList 
                  clients={filteredClients} 
                  selectedClients={selectedClients}
                  toggleSelectAll={toggleSelectAll}
                  toggleClientSelection={toggleClientSelection}
                  visibleColumns={visibleColumns}
                />
              </TabsContent>
              <TabsContent value="residential" className="mt-4">
                <ClientList 
                  clients={filteredClients.filter(
                    (client) => client.type === "residential"
                  )} 
                  selectedClients={selectedClients}
                  toggleSelectAll={toggleSelectAll}
                  toggleClientSelection={toggleClientSelection}
                  visibleColumns={visibleColumns}
                />
              </TabsContent>
              <TabsContent value="commercial" className="mt-4">
                <ClientList 
                  clients={filteredClients.filter(
                    (client) => client.type === "commercial"
                  )} 
                  selectedClients={selectedClients}
                  toggleSelectAll={toggleSelectAll}
                  toggleClientSelection={toggleClientSelection}
                  visibleColumns={visibleColumns}
                />
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters Drawer */}
      <Drawer open={isFilterDrawerOpen} onOpenChange={setIsFilterDrawerOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Advanced Filters</DrawerTitle>
            <DrawerDescription>
              Filter clients by multiple criteria
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 py-2 overflow-y-auto">
            <ClientFilters 
              filters={advancedFilters} 
              setFilters={setAdvancedFilters} 
            />
          </div>
          <DrawerFooter className="border-t pt-4">
            <div className="flex justify-between w-full">
              <Button variant="outline" onClick={() => {
                setAdvancedFilters({
                  tags: [],
                  status: "all",
                  dateRange: { start: null, end: null },
                  nextJobRange: { start: null, end: null },
                  balanceStatus: "all",
                  zipCodes: [],
                  staff: []
                });
              }}>
                Reset Filters
              </Button>
              <Button onClick={() => {
                setIsFilterDrawerOpen(false);
                toast({
                  title: "Filters Applied",
                  description: "Client list updated with your filters",
                });
              }}>
                Apply Filters
              </Button>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Quick View Panel */}
      <Drawer open={isQuickViewOpen} onOpenChange={setIsQuickViewOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Client Details</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4">
            {selectedClient && <ClientQuickView client={selectedClient} />}
          </div>
          <DrawerFooter className="border-t">
            <div className="flex justify-between w-full">
              <Button variant="outline" asChild>
                <Link to={`/clients/${selectedClient?.id}`}>
                  View Full Profile
                </Link>
              </Button>
              <Button variant="outline" className="gap-2">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            </div>
            <DrawerClose />
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      
      {/* Bulk Actions Panel - show only when clients are selected */}
      {selectedClients.length > 0 && (
        <ClientBulkActions 
          count={selectedClients.length} 
          onClearSelection={() => setSelectedClients([])} 
        />
      )}
    </div>
  );
};

interface ClientListProps {
  clients: Client[];
  selectedClients: string[];
  toggleSelectAll: () => void;
  toggleClientSelection: (clientId: string) => void;
  visibleColumns: ClientColumn[];
}

const ClientList: React.FC<ClientListProps> = ({ 
  clients,
  selectedClients,
  toggleSelectAll,
  toggleClientSelection,
  visibleColumns
}) => {
  if (clients.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No clients found. Try adjusting your search or filters.
      </div>
    );
  }

  const isAllSelected = clients.length > 0 && selectedClients.length === clients.length;

  // Determine if a column is visible
  const isColumnVisible = (column: ClientColumn) => visibleColumns.includes(column);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox 
                checked={isAllSelected} 
                onCheckedChange={toggleSelectAll} 
              />
            </TableHead>
            <TableHead className="font-medium">Name</TableHead>
            {isColumnVisible("contact") && (
              <TableHead className="font-medium hidden md:table-cell">
                Contact
              </TableHead>
            )}
            {isColumnVisible("address") && (
              <TableHead className="font-medium hidden lg:table-cell">
                Address
              </TableHead>
            )}
            {isColumnVisible("type") && (
              <TableHead className="font-medium hidden sm:table-cell">
                Type
              </TableHead>
            )}
            {isColumnVisible("status") && (
              <TableHead className="font-medium hidden sm:table-cell">
                Status
              </TableHead>
            )}
            {isColumnVisible("lastService") && (
              <TableHead className="font-medium hidden xl:table-cell">
                Last Service
              </TableHead>
            )}
            {isColumnVisible("nextService") && (
              <TableHead className="font-medium hidden xl:table-cell">
                Next Job
              </TableHead>
            )}
            {isColumnVisible("balance") && (
              <TableHead className="font-medium hidden xl:table-cell">
                Balance
              </TableHead>
            )}
            {isColumnVisible("clientSince") && (
              <TableHead className="font-medium hidden xl:table-cell">
                Client Since
              </TableHead>
            )}
            {isColumnVisible("assignedStaff") && (
              <TableHead className="font-medium hidden xl:table-cell">
                Staff
              </TableHead>
            )}
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => {
            // Get primary contact or first contact
            const primaryContact =
              client.contacts.find((c) => c.isPrimary) || client.contacts[0];
            // Get first address
            const primaryAddress = client.addresses[0];
            const isSelected = selectedClients.includes(client.id);

            return (
              <TableRow
                key={client.id}
                className={`hover:bg-muted/50 transition-colors ${
                  isSelected ? "bg-muted/30" : ""
                }`}
              >
                <TableCell className="p-2">
                  <Checkbox 
                    checked={isSelected}
                    onCheckedChange={() => toggleClientSelection(client.id)}
                  />
                </TableCell>
                <TableCell className="py-3">
                  <div className="flex items-center gap-2">
                    <div>
                      <Link
                        to={`/clients/${client.id}`}
                        className="font-medium hover:underline"
                      >
                        {client.name}
                      </Link>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {client.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs px-1 h-5"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </TableCell>
                {isColumnVisible("contact") && (
                  <TableCell className="py-3 hidden md:table-cell">
                    <div className="flex flex-col">
                      <span>{primaryContact.email}</span>
                      <span className="text-sm text-muted-foreground flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {formatPhoneNumber(primaryContact.phone)}
                      </span>
                    </div>
                  </TableCell>
                )}
                {isColumnVisible("address") && (
                  <TableCell className="py-3 hidden lg:table-cell text-sm">
                    <div className="max-w-[250px]">
                      <span>
                        {primaryAddress.street}
                      </span>
                      <div className="text-muted-foreground">
                        {primaryAddress.city}, {primaryAddress.state} {primaryAddress.zipCode}
                      </div>
                    </div>
                  </TableCell>
                )}
                {isColumnVisible("type") && (
                  <TableCell className="py-3 hidden sm:table-cell">
                    <Badge variant={client.type === "residential" ? "outline" : "secondary"}>
                      {client.type === "residential" ? "Residential" : "Commercial"}
                    </Badge>
                  </TableCell>
                )}
                {isColumnVisible("status") && (
                  <TableCell className="py-3 hidden sm:table-cell">
                    <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200">
                      Active
                    </Badge>
                  </TableCell>
                )}
                {isColumnVisible("lastService") && (
                  <TableCell className="py-3 hidden xl:table-cell text-sm">
                    {client.lastService ? client.lastService : "No services yet"}
                  </TableCell>
                )}
                {isColumnVisible("nextService") && (
                  <TableCell className="py-3 hidden xl:table-cell text-sm">
                    {client.lastService || "None scheduled"}
                  </TableCell>
                )}
                {isColumnVisible("balance") && (
                  <TableCell className="py-3 hidden xl:table-cell text-sm">
                    <span className="font-medium">$0.00</span>
                  </TableCell>
                )}
                {isColumnVisible("clientSince") && (
                  <TableCell className="py-3 hidden xl:table-cell text-sm">
                    <span>Mar 15, 2023</span>
                  </TableCell>
                )}
                {isColumnVisible("assignedStaff") && (
                  <TableCell className="py-3 hidden xl:table-cell text-sm">
                    <span>John Doe</span>
                  </TableCell>
                )}
                <TableCell className="py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link
                          to={`/clients/${client.id}`}
                          className="flex items-center w-full"
                        >
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="flex items-center">
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Client
                      </DropdownMenuItem>
                      <DropdownMenuItem>Schedule Job</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Tag className="mr-2 h-4 w-4" />
                        Manage Tags
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Users className="mr-2 h-4 w-4" />
                        Assign Staff
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default Clients;
