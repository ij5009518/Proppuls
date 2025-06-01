import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Upload, 
  Send, 
  FileText, 
  MessageSquare, 
  Bot, 
  User, 
  CheckCircle, 
  AlertTriangle,
  BarChart3,
  FileImage,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  action?: string;
  data?: any;
}

interface DocumentAnalysis {
  documentType: string;
  summary: string;
  keyPoints: string[];
  urgency: string;
  suggestedTasks: any[];
  extractedData: any;
}

export default function AIAssistant() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [summaryType, setSummaryType] = useState("overall");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: properties = [] } = useQuery({
    queryKey: ["/api/properties"],
  });

  // Document upload and analysis
  const documentAnalysisMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/ai/analyze-document', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Document analysis failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Document Analyzed",
        description: `${data.analysis.documentType} processed successfully. ${data.createdTasks.length} tasks created.`,
      });
      
      // Invalidate tasks to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      
      // Add analysis to chat
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `Document Analysis Complete:\n\n**Type:** ${data.analysis.documentType}\n**Summary:** ${data.analysis.summary}\n\n**Key Points:**\n${data.analysis.keyPoints.map((point: string) => `• ${point}`).join('\n')}\n\n**Tasks Created:** ${data.createdTasks.length}`,
        timestamp: new Date(),
        action: 'document_analysis',
        data: data
      }]);
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze document. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Chat functionality
  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });
      
      if (!response.ok) {
        throw new Error('Chat request failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        action: data.action,
        data: data
      }]);
      
      if (data.createdProperty || data.createdTenant) {
        queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
        queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
        
        toast({
          title: "Success",
          description: data.createdProperty ? "Property created successfully!" : "Tenant created successfully!",
        });
      }
      
      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Chat Error",
        description: "Failed to process your message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Summary generation
  const summaryMutation = useMutation({
    mutationFn: async (type: string) => {
      const response = await fetch('/api/ai/generate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      });
      
      if (!response.ok) {
        throw new Error('Summary generation failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: data.summary,
        timestamp: new Date(),
        action: 'summary_report',
        data: data
      }]);
    },
    onError: (error) => {
      toast({
        title: "Summary Error",
        description: "Failed to generate summary. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('document', selectedFile);
    if (selectedProperty && selectedProperty !== 'none') {
      formData.append('propertyId', selectedProperty);
    }

    // Add user message to chat
    setChatMessages(prev => [...prev, {
      role: 'user',
      content: `Uploaded document: ${selectedFile.name}${selectedProperty ? ` for property ${selectedProperty}` : ''}`,
      timestamp: new Date()
    }]);

    documentAnalysisMutation.mutate(formData);
    setSelectedFile(null);
  };

  const handleChatSubmit = () => {
    if (!chatInput.trim()) return;

    // Add user message to chat
    setChatMessages(prev => [...prev, {
      role: 'user',
      content: chatInput,
      timestamp: new Date()
    }]);

    chatMutation.mutate(chatInput);
    setChatInput("");
  };

  const handleGenerateSummary = () => {
    // Add user message to chat
    setChatMessages(prev => [...prev, {
      role: 'user',
      content: `Generate ${summaryType} summary report`,
      timestamp: new Date()
    }]);

    summaryMutation.mutate(summaryType);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">AI Assistant</h1>
        <Badge variant="secondary" className="flex items-center space-x-1">
          <Bot className="h-4 w-4" />
          <span>Powered by OpenAI</span>
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Document Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Upload Document</label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Supports images and PDFs (max 10MB)
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Property (Optional)</label>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific property</SelectItem>
                  {(properties as any[]).map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleFileUpload} 
              disabled={!selectedFile || documentAnalysisMutation.isPending}
              className="w-full"
            >
              {documentAnalysisMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <FileImage className="h-4 w-4 mr-2" />
                  Analyze Document
                </>
              )}
            </Button>

            <div className="text-xs text-muted-foreground">
              <p><strong>What I can do:</strong></p>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li>Identify violation notices</li>
                <li>Extract key information</li>
                <li>Create automatic tasks</li>
                <li>Categorize documents</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Summary Generator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Generate Reports</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Report Type</label>
              <Select value={summaryType} onValueChange={setSummaryType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overall">Overall Summary</SelectItem>
                  <SelectItem value="financial">Financial Report</SelectItem>
                  <SelectItem value="properties">Property Portfolio</SelectItem>
                  <SelectItem value="tenants">Tenant Report</SelectItem>
                  <SelectItem value="tasks">Task & Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleGenerateSummary}
              disabled={summaryMutation.isPending}
              className="w-full"
            >
              {summaryMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>

            <div className="text-xs text-muted-foreground">
              <p><strong>AI-Generated insights:</strong></p>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li>Key metrics & trends</li>
                <li>Performance analysis</li>
                <li>Actionable recommendations</li>
                <li>Professional formatting</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Chat Interface */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>AI Chat</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-[300px] border rounded-lg p-3">
              {chatMessages.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  <Bot className="h-8 w-8 mx-auto mb-2" />
                  <p>Start a conversation!</p>
                  <p className="text-xs mt-1">Try: "Add a new property at 123 Main St" or "Create a tenant John Doe"</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {chatMessages.map((message, index) => (
                    <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        <div className="flex items-start space-x-2">
                          {message.role === 'assistant' ? (
                            <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          ) : (
                            <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            {message.data?.createdProperty && (
                              <Badge className="mt-2 bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Property Created
                              </Badge>
                            )}
                            {message.data?.createdTenant && (
                              <Badge className="mt-2 bg-blue-100 text-blue-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Tenant Created
                              </Badge>
                            )}
                            {message.data?.createdTasks && message.data.createdTasks.length > 0 && (
                              <Badge className="mt-2 bg-orange-100 text-orange-800">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {message.data.createdTasks.length} Tasks Created
                              </Badge>
                            )}
                            <p className="text-xs opacity-70 mt-1">
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="flex space-x-2">
              <Textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask me anything or tell me to add properties/tenants..."
                className="flex-1 min-h-[40px] max-h-[120px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleChatSubmit();
                  }
                }}
              />
              <Button 
                onClick={handleChatSubmit}
                disabled={!chatInput.trim() || chatMutation.isPending}
                size="icon"
              >
                {chatMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Examples */}
      <Card>
        <CardHeader>
          <CardTitle>AI Assistant Capabilities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold mb-2 flex items-center">
                <Upload className="h-4 w-4 mr-2" />
                Document Analysis
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Upload violation notices</li>
                <li>• Analyze inspection reports</li>
                <li>• Extract key information</li>
                <li>• Auto-create tasks</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2 flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                Conversational Management
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• "Add property at 123 Main St"</li>
                <li>• "Create tenant John Smith"</li>
                <li>• "Show me property summary"</li>
                <li>• "What tasks are overdue?"</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2 flex items-center">
                <BarChart3 className="h-4 w-4 mr-2" />
                Smart Reports
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Financial summaries</li>
                <li>• Portfolio analysis</li>
                <li>• Performance insights</li>
                <li>• Recommendations</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}