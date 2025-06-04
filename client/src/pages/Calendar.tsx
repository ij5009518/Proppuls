import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, DollarSign, CheckCircle, AlertTriangle, Plus } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { InsertTask } from "@shared/schema";

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'task' | 'expense' | 'rent';
  status: string;
  amount?: number;
  priority?: string;
  description?: string;
}

const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  category: z.string().min(1, "Category is required"),
  dueDate: z.string().min(1, "Due date is required"),
  assignedTo: z.string().optional(),
  propertyId: z.string().optional(),
  unitId: z.string().optional(),
  notes: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [selectedDateForTask, setSelectedDateForTask] = useState<Date | null>(null);
  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["/api/expenses"],
  });

  const { data: rentPayments = [] } = useQuery({
    queryKey: ["/api/rent-payments"],
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["/api/properties"],
  });

  const { data: units = [] } = useQuery({
    queryKey: ["/api/units"],
  });

  // Task creation mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      return apiRequest("POST", "/api/tasks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setShowTaskDialog(false);
      form.reset();
    },
  });

  // Form for creating tasks
  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      category: "",
      dueDate: "",
      assignedTo: "",
      propertyId: "",
      unitId: "",
      notes: "",
    },
  });

  // Generate calendar events from data
  const generateCalendarEvents = (): CalendarEvent[] => {
    const events: CalendarEvent[] = [];

    // Add tasks
    (tasks as any[]).forEach(task => {
      if (task.dueDate) {
        events.push({
          id: `task-${task.id}`,
          title: task.title,
          date: new Date(task.dueDate),
          type: 'task',
          status: task.status,
          priority: task.priority,
          description: task.description
        });
      }
    });

    // Add expenses (due dates)
    (expenses as any[]).forEach(expense => {
      if (expense.date) {
        events.push({
          id: `expense-${expense.id}`,
          title: `${expense.category} - ${expense.description}`,
          date: new Date(expense.date),
          type: 'expense',
          status: 'due',
          amount: parseFloat(expense.amount)
        });
      }
    });

    // Add rent payments
    (rentPayments as any[]).forEach(payment => {
      if (payment.dueDate) {
        events.push({
          id: `rent-${payment.id}`,
          title: `Rent Payment - Unit ${payment.unitId}`,
          date: new Date(payment.dueDate),
          type: 'rent',
          status: payment.status,
          amount: parseFloat(payment.amount)
        });
      }
    });

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const calendarEvents = generateCalendarEvents();

  // Get current month calendar grid
  const generateCalendarGrid = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const calendarGrid = generateCalendarGrid();

  // Get events for a specific date
  const getEventsForDate = (date: Date | null): CalendarEvent[] => {
    if (!date) return [];
    return calendarEvents.filter(event => 
      event.date.toDateString() === date.toDateString()
    );
  };

  // Navigate months
  const previousMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));
  };

  const getEventColor = (event: CalendarEvent) => {
    switch (event.type) {
      case 'task':
        if (event.priority === 'high') return 'bg-red-100 text-red-800 border-red-200';
        if (event.priority === 'medium') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'expense':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'rent':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEventIcon = (event: CalendarEvent) => {
    switch (event.type) {
      case 'task':
        return event.status === 'completed' ? CheckCircle : Clock;
      case 'expense':
        return AlertTriangle;
      case 'rent':
        return DollarSign;
      default:
        return CalendarIcon;
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Get upcoming events (next 7 days)
  const getUpcomingEvents = () => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return calendarEvents.filter(event => 
      event.date >= today && event.date <= nextWeek
    ).slice(0, 10);
  };

  const upcomingEvents = getUpcomingEvents();

  // Handle task form submission
  const onTaskSubmit = (data: TaskFormData) => {
    const taskData: InsertTask = {
      title: data.title,
      description: data.description,
      priority: data.priority,
      category: data.category,
      dueDate: new Date(data.dueDate),
      assignedTo: data.assignedTo || undefined,
      propertyId: data.propertyId || undefined,
      unitId: data.unitId || undefined,
      notes: data.notes || undefined,
      status: "pending",
    };

    createTaskMutation.mutate(taskData);
  };

  // Handle date click for task creation
  const handleDateClick = (date: Date) => {
    setSelectedDateForTask(date);
    form.setValue("dueDate", date.toISOString().split('T')[0]);
    setShowTaskDialog(true);
  };

  // Render day view
  const renderDayView = () => {
    const events = getEventsForDate(selectedDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h3>
          <Button onClick={() => handleDateClick(selectedDate)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
        
        <div className="border rounded-lg">
          {hours.map(hour => (
            <div key={hour} className="border-b last:border-b-0 p-3 min-h-[60px]">
              <div className="flex">
                <div className="w-20 text-sm text-muted-foreground">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                <div className="flex-1">
                  {events
                    .filter(event => {
                      // For simplicity, show all events at 9 AM if no specific time
                      return hour === 9;
                    })
                    .map(event => {
                      const EventIcon = getEventIcon(event);
                      return (
                        <div
                          key={event.id}
                          className={`p-2 rounded border mb-1 ${getEventColor(event)}`}
                        >
                          <div className="flex items-center space-x-2">
                            <EventIcon className="h-4 w-4" />
                            <span className="font-medium">{event.title}</span>
                          </div>
                          {event.amount && (
                            <div className="text-sm mt-1">
                              {formatCurrency(event.amount)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('month')}
          >
            Month
          </Button>
          <Button
            variant={viewMode === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('week')}
          >
            Week
          </Button>
          <Button
            variant={viewMode === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('day')}
          >
            Day
          </Button>
          <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onTaskSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter task title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter task description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Maintenance, Inspection" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="propertyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select property" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No property</SelectItem>
                              {(properties as any[]).map((property) => (
                                <SelectItem key={property.id} value={property.id}>
                                  {property.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional notes" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowTaskDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createTaskMutation.isPending}>
                      {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {viewMode === 'day' ? (
        <Card className="col-span-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Day View</CardTitle>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setDate(newDate.getDate() - 1);
                  setSelectedDate(newDate);
                }}>
                  ←
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setDate(newDate.getDate() + 1);
                  setSelectedDate(newDate);
                }}>
                  →
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderDayView()}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar Grid */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">
                  {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={previousMonth}>
                    ←
                  </Button>
                  <Button variant="outline" size="sm" onClick={nextMonth}>
                    →
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 mb-4">
                {dayNames.map(day => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-2">
                {calendarGrid.map((date, index) => {
                  const events = getEventsForDate(date);
                  const isToday = date && date.toDateString() === new Date().toDateString();
                  
                  return (
                    <div
                      key={index}
                      className={`min-h-[100px] p-2 border rounded-lg cursor-pointer ${
                        date ? 'bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-accent' : 'bg-gray-50 dark:bg-muted'
                      } ${isToday ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => date && handleDateClick(date)}
                    >
                      {date && (
                        <>
                          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : ''}`}>
                            {date.getDate()}
                          </div>
                          <div className="space-y-1">
                            {events.slice(0, 3).map(event => {
                              const EventIcon = getEventIcon(event);
                              return (
                                <div
                                  key={event.id}
                                  className={`text-xs p-1 rounded border ${getEventColor(event)}`}
                                  title={event.title}
                                >
                                  <div className="flex items-center space-x-1">
                                    <EventIcon className="h-3 w-3" />
                                    <span className="truncate">{event.title}</span>
                                  </div>
                                  {event.amount && (
                                    <div className="text-xs mt-1">
                                      {formatCurrency(event.amount)}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {events.length > 3 && (
                              <div className="text-xs text-muted-foreground">
                                +{events.length - 3} more
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events Sidebar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming events</p>
                ) : (
                  upcomingEvents.map(event => {
                    const EventIcon = getEventIcon(event);
                    return (
                      <div key={event.id} className="border-l-4 border-primary pl-3 py-2">
                        <div className="flex items-start space-x-2">
                          <EventIcon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{event.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(event.date)}
                            </p>
                            {event.amount && (
                              <p className="text-xs font-medium text-primary">
                                {formatCurrency(event.amount)}
                              </p>
                            )}
                            <Badge 
                              variant={event.status === 'completed' || event.status === 'paid' ? 'default' : 'secondary'}
                              className="text-xs mt-1"
                            >
                              {event.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded"></div>
              <span className="text-sm">Tasks</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-100 border border-orange-200 rounded"></div>
              <span className="text-sm">Expenses</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
              <span className="text-sm">Rent Payments</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
              <span className="text-sm">High Priority</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}