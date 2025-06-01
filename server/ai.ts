import OpenAI from 'openai';
import multer from 'multer';
import { Express } from 'express';
import { AuthenticatedRequest } from './auth';
import { storage } from './storage';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and PDFs
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDFs are allowed'));
    }
  },
});

export function registerAIRoutes(app: Express) {
  // Document analysis endpoint
  app.post('/api/ai/analyze-document', upload.single('document'), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { propertyId } = req.body;
      const fileBuffer = req.file.buffer;
      const fileName = req.file.originalname;
      const mimeType = req.file.mimetype;

      let analysis;

      if (mimeType.startsWith('image/')) {
        // Analyze image with vision
        const base64Image = fileBuffer.toString('base64');
        
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analyze this property-related document. Identify what type of document this is (violation notice, inspection report, maintenance request, lease agreement, etc.) and extract key information. If it's a violation or issue that requires action, suggest what tasks should be created. Format your response as JSON with these fields:
                  {
                    "documentType": "type of document",
                    "summary": "brief summary",
                    "keyPoints": ["point1", "point2"],
                    "urgency": "low|medium|high|urgent",
                    "suggestedTasks": [{"title": "task title", "description": "task description", "priority": "low|medium|high|urgent", "category": "category"}],
                    "extractedData": {"any relevant data like dates, amounts, addresses"}
                  }`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          max_tokens: 1000
        });

        analysis = JSON.parse(response.choices[0].message.content || '{}');
      } else {
        // For PDFs, use text extraction (simplified approach)
        analysis = {
          documentType: "PDF Document",
          summary: "PDF document uploaded - manual review recommended",
          keyPoints: ["PDF document requires manual processing"],
          urgency: "medium",
          suggestedTasks: [{
            title: "Review uploaded PDF document",
            description: `Review and process PDF document: ${fileName}`,
            priority: "medium",
            category: "Document Review"
          }],
          extractedData: { fileName, uploadDate: new Date().toISOString() }
        };
      }

      // Auto-create tasks if suggested
      const createdTasks = [];
      if (analysis.suggestedTasks && analysis.suggestedTasks.length > 0) {
        for (const taskSuggestion of analysis.suggestedTasks) {
          const taskData = {
            title: taskSuggestion.title,
            description: taskSuggestion.description,
            priority: taskSuggestion.priority,
            category: taskSuggestion.category,
            status: 'pending',
            propertyId: propertyId || undefined,
            notes: `Auto-created from document analysis: ${fileName}`,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
          };

          const createdTask = await storage.createTask(taskData);
          createdTasks.push(createdTask);
        }
      }

      res.json({
        analysis,
        createdTasks,
        fileName,
        documentType: analysis.documentType
      });

    } catch (error) {
      console.error('Document analysis error:', error);
      res.status(500).json({ error: 'Failed to analyze document' });
    }
  });

  // Chat-based property/tenant management
  app.post('/api/ai/chat', async (req: AuthenticatedRequest, res) => {
    try {
      const { message, context } = req.body;

      // Get current data context
      const properties = await storage.getAllProperties();
      const tenants = await storage.getAllTenants();
      const units = await storage.getAllUnits();

      const systemPrompt = `You are an AI assistant for a property management platform. You can help with:
      1. Creating properties and tenants through conversation
      2. Generating summaries and reports
      3. Answering questions about the property portfolio

      Current data context:
      - Properties: ${properties.length} total
      - Tenants: ${tenants.length} total  
      - Units: ${units.length} total

      When the user wants to add properties or tenants, extract the information and format your response as JSON with an "action" field:
      
      For adding property:
      {
        "action": "create_property",
        "data": {
          "name": "property name",
          "address": "full address",
          "type": "single_family|multi_family|apartment|commercial",
          "purchasePrice": number,
          "description": "description"
        },
        "response": "conversational response"
      }

      For adding tenant:
      {
        "action": "create_tenant", 
        "data": {
          "firstName": "first name",
          "lastName": "last name",
          "email": "email",
          "phone": "phone",
          "unitId": "unit_id_if_known"
        },
        "response": "conversational response"
      }

      For general questions or summaries, respond with:
      {
        "action": "chat_response",
        "response": "your helpful response"
      }

      Be conversational and helpful. Ask for clarification if needed.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        max_tokens: 1000
      });

      const aiResponse = JSON.parse(response.choices[0].message.content || '{"action": "chat_response", "response": "I apologize, but I couldn\'t process that request."}');

      // Handle actions
      let result = { ...aiResponse };

      if (aiResponse.action === 'create_property' && aiResponse.data) {
        try {
          const newProperty = await storage.createProperty(aiResponse.data);
          result.createdProperty = newProperty;
        } catch (error) {
          result.error = 'Failed to create property. Please check the information provided.';
        }
      } else if (aiResponse.action === 'create_tenant' && aiResponse.data) {
        try {
          const newTenant = await storage.createTenant(aiResponse.data);
          result.createdTenant = newTenant;
        } catch (error) {
          result.error = 'Failed to create tenant. Please check the information provided.';
        }
      }

      res.json(result);

    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ error: 'Failed to process chat request' });
    }
  });

  // Generate summary reports
  app.post('/api/ai/generate-summary', async (req: AuthenticatedRequest, res) => {
    try {
      const { type } = req.body; // 'financial', 'properties', 'tenants', 'tasks'

      let data = {};
      let promptContext = '';

      switch (type) {
        case 'financial':
          const expenses = await storage.getAllExpenses();
          const rentPayments = await storage.getAllRentPayments();
          data = { expenses, rentPayments };
          promptContext = 'Generate a financial summary report based on expenses and rent payments data.';
          break;
        
        case 'properties':
          const properties = await storage.getAllProperties();
          const units = await storage.getAllUnits();
          data = { properties, units };
          promptContext = 'Generate a property portfolio summary report.';
          break;
        
        case 'tenants':
          const tenants = await storage.getAllTenants();
          data = { tenants };
          promptContext = 'Generate a tenant summary report.';
          break;
        
        case 'tasks':
          const tasks = await storage.getAllTasks();
          data = { tasks };
          promptContext = 'Generate a task and maintenance summary report.';
          break;
        
        default:
          // Generate overall summary
          const allProperties = await storage.getAllProperties();
          const allTenants = await storage.getAllTenants();
          const allTasks = await storage.getAllTasks();
          const allExpenses = await storage.getAllExpenses();
          data = { 
            properties: allProperties, 
            tenants: allTenants, 
            tasks: allTasks, 
            expenses: allExpenses 
          };
          promptContext = 'Generate a comprehensive property management summary report.';
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant that generates professional property management reports. ${promptContext} 
            
            Provide insights, key metrics, trends, and actionable recommendations. Format the response as structured text with clear sections and bullet points. Be concise but comprehensive.`
          },
          {
            role: "user", 
            content: `Please analyze this data and generate a summary report: ${JSON.stringify(data)}`
          }
        ],
        max_tokens: 1500
      });

      const summary = response.choices[0].message.content;

      res.json({
        summary,
        type,
        generatedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('Summary generation error:', error);
      res.status(500).json({ error: 'Failed to generate summary' });
    }
  });
}