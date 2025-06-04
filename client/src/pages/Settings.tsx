import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Upload, Download, Users, Trash2, Edit2, Plus, FileSpreadsheet, Info, ChevronDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User } from '@shared/schema';

export default function Settings() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<any>(null);
  const [selectedDataType, setSelectedDataType] = useState<string>('properties');

  // Fetch users
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/users'],
    queryFn: () => apiRequest('GET', '/api/users'),
  });

  // Bulk upload mutation
  const bulkUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/bulk-upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setUploadResults(data);
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      queryClient.invalidateQueries({ queryKey: ['/api/units'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      toast({
        title: "Bulk Upload Complete",
        description: `Successfully processed ${data.successCount} records`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadResults(null);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      setIsUploading(true);
      bulkUploadMutation.mutate(selectedFile);
    }
  };

  // Data type options
  const dataTypeOptions = [
    { value: 'properties', label: 'Properties' },
    { value: 'units', label: 'Units' },
    { value: 'tenants', label: 'Tenants' },
    { value: 'tasks', label: 'Tasks' },
    { value: 'expenses', label: 'Expenses' },
    { value: 'mortgages', label: 'Mortgages' }
  ];

  const downloadSampleFile = () => {
    const sampleDataTemplates: Record<string, any[]> = {
      properties: [
        {
          type: 'property',
          name: 'Sunset Apartments',
          address: '123 Main St',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90210',
          propertyType: 'apartment',
          purchasePrice: '500000',
          currentValue: '600000'
        },
        {
          type: 'property',
          name: 'Oak Villa',
          address: '456 Oak Ave',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102',
          propertyType: 'house',
          purchasePrice: '800000',
          currentValue: '900000'
        }
      ],
      units: [
        {
          type: 'unit',
          propertyName: 'Sunset Apartments',
          unitNumber: '101',
          bedrooms: '2',
          bathrooms: '1',
          squareFootage: '800',
          monthlyRent: '1500'
        },
        {
          type: 'unit',
          propertyName: 'Sunset Apartments',
          unitNumber: '102',
          bedrooms: '1',
          bathrooms: '1',
          squareFootage: '600',
          monthlyRent: '1200'
        }
      ],
      tenants: [
        {
          type: 'tenant',
          propertyName: 'Sunset Apartments',
          unitNumber: '101',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@email.com',
          phone: '555-0123',
          leaseStart: '2024-01-01',
          leaseEnd: '2024-12-31',
          monthlyRent: '1500',
          securityDeposit: '3000'
        },
        {
          type: 'tenant',
          propertyName: 'Oak Villa',
          unitNumber: 'A',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@email.com',
          phone: '555-0456',
          leaseStart: '2024-02-01',
          leaseEnd: '2025-01-31',
          monthlyRent: '2500',
          securityDeposit: '5000'
        }
      ],
      tasks: [
        {
          type: 'task',
          propertyName: 'Sunset Apartments',
          title: 'Fix leaky faucet',
          description: 'Repair faucet in unit 101',
          category: 'maintenance',
          priority: 'high',
          status: 'pending',
          dueDate: '2024-07-15'
        },
        {
          type: 'task',
          propertyName: 'Oak Villa',
          title: 'Annual inspection',
          description: 'Conduct yearly property inspection',
          category: 'inspection',
          priority: 'medium',
          status: 'pending',
          dueDate: '2024-08-01'
        }
      ],
      expenses: [
        {
          type: 'expense',
          propertyName: 'Sunset Apartments',
          category: 'maintenance',
          amount: '150.00',
          description: 'Plumbing repair',
          date: '2024-06-01',
          vendor: 'ABC Plumbing'
        },
        {
          type: 'expense',
          propertyName: 'Oak Villa',
          category: 'utilities',
          amount: '250.00',
          description: 'Monthly electricity bill',
          date: '2024-06-01',
          vendor: 'City Electric'
        }
      ],
      mortgages: [
        {
          type: 'mortgage',
          propertyName: 'Sunset Apartments',
          lenderName: 'Bank of America',
          loanAmount: '400000',
          interestRate: '3.5',
          termYears: '30',
          monthlyPayment: '1796.18',
          startDate: '2020-01-01'
        },
        {
          type: 'mortgage',
          propertyName: 'Oak Villa',
          lenderName: 'Wells Fargo',
          loanAmount: '600000',
          interestRate: '3.25',
          termYears: '25',
          monthlyPayment: '2930.24',
          startDate: '2021-06-01'
        }
      ]
    };

    const sampleData = sampleDataTemplates[selectedDataType];
    if (!sampleData || sampleData.length === 0) return;

    const csv = [
      Object.keys(sampleData[0]).join(','),
      ...sampleData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedDataType}_sample.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your system configuration and users</p>
        </div>
      </div>

      <Tabs defaultValue="bulk-upload" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bulk-upload">Bulk Upload</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="general">General Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="bulk-upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Bulk Data Upload
              </CardTitle>
              <CardDescription>
                Upload CSV files to import multiple properties, units, tenants, or expenses at once
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label htmlFor="data-type">Data Type</Label>
                <Select value={selectedDataType} onValueChange={setSelectedDataType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select data type to upload" />
                  </SelectTrigger>
                  <SelectContent>
                    {dataTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Upload a CSV file with {dataTypeOptions.find(opt => opt.value === selectedDataType)?.label.toLowerCase()} data. Download the sample file below to see the expected format.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label htmlFor="file-upload">Select CSV File</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="cursor-pointer"
                  />
                  {selectedFile && (
                    <div className="text-sm text-muted-foreground">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <Label>Sample File</Label>
                  <Button
                    variant="outline"
                    onClick={downloadSampleFile}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download {dataTypeOptions.find(opt => opt.value === selectedDataType)?.label} Sample
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Download a sample file to see the expected format for {dataTypeOptions.find(opt => opt.value === selectedDataType)?.label.toLowerCase()}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex gap-4">
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || bulkUploadMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {bulkUploadMutation.isPending ? 'Uploading...' : 'Upload Data'}
                </Button>
              </div>

              {uploadResults && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Upload Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{uploadResults.successCount || 0}</div>
                        <div className="text-sm text-muted-foreground">Successful</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{uploadResults.errorCount || 0}</div>
                        <div className="text-sm text-muted-foreground">Errors</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{uploadResults.propertiesCreated || 0}</div>
                        <div className="text-sm text-muted-foreground">Properties</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{uploadResults.unitsCreated || 0}</div>
                        <div className="text-sm text-muted-foreground">Units</div>
                      </div>
                    </div>
                    {uploadResults.errors && uploadResults.errors.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium text-red-600 mb-2">Errors:</h4>
                        <ul className="text-sm space-y-1">
                          {uploadResults.errors.map((error: string, index: number) => (
                            <li key={index} className="text-red-600">• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage system users and their permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="text-center py-8">Loading users...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users && users.length > 0 ? (
                      users.map((user: User) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.firstName} {user.lastName}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline">
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure general application settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input id="company-name" placeholder="Enter company name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default-currency">Default Currency</Label>
                  <Input id="default-currency" placeholder="USD" />
                </div>
              </div>
              <Button>Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}