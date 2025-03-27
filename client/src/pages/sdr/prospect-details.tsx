import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import SidebarLayout from "@/components/layouts/sidebar-layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Prospect } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { 
  Select, 
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, 
  ExternalLink, 
  ArrowLeft, 
  Linkedin, 
  Twitter, 
  Instagram, 
  Search as SearchIcon, 
  HelpCircle,
  Loader2
} from "lucide-react";
import { FaQuora } from "react-icons/fa";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function ProspectDetails() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const prospectId = params.id ? parseInt(params.id) : null;
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [stage, setStage] = useState<string>("");

  // Redirect if no id
  useEffect(() => {
    if (!prospectId) {
      setLocation("/sdr/saved-prospects");
    }
  }, [prospectId, setLocation]);

  // Fetch prospect details
  const {
    data: prospect,
    isLoading: isLoadingProspect,
  } = useQuery<Prospect>({
    queryKey: [`/api/sdr/prospects/${prospectId}`],
    enabled: !!prospectId,
  });

  useEffect(() => {
    if (prospect) {
      setStage(prospect.stage || "new");
      setNotes(prospect.notes || "");
    }
  }, [prospect]);

  // Update prospect mutation
  const updateProspectMutation = useMutation({
    mutationFn: async (data: Partial<Prospect>) => {
      const res = await apiRequest("PATCH", `/api/sdr/prospects/${prospectId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sdr/prospects/${prospectId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/sdr/prospects"] });
      toast({
        title: "Prospect updated",
        description: "The prospect has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveChanges = () => {
    updateProspectMutation.mutate({ 
      stage,
      notes
    });
  };

  const getChannelIcon = (channelType: string) => {
    switch (channelType) {
      case 'linkedin':
        return <Linkedin className="h-5 w-5 text-blue-600" />;
      case 'twitter':
        return <Twitter className="h-5 w-5 text-blue-500" />;
      case 'instagram':
        return <Instagram className="h-5 w-5 text-red-500" />;
      case 'quora':
        return <FaQuora className="h-5 w-5 text-red-700" />;
      case 'google':
        return <SearchIcon className="h-5 w-5 text-red-500" />;
      default:
        return <HelpCircle className="h-5 w-5 text-neutral-400" />;
    }
  };

  const getStageColor = (stage: string | undefined) => {
    switch (stage) {
      case 'new':
        return 'bg-neutral-100 text-neutral-800';
      case 'contacted':
        return 'bg-blue-100 text-blue-800';
      case 'connected':
        return 'bg-green-100 text-green-800';
      case 'meeting_scheduled':
        return 'bg-purple-100 text-purple-800';
      case 'qualified':
        return 'bg-indigo-100 text-indigo-800';
      case 'disqualified':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const formatStage = (stage: string | undefined) => {
    if (!stage) return 'New';
    return stage.charAt(0).toUpperCase() + stage.slice(1).replace(/_/g, ' ');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (isLoadingProspect) {
    return (
      <SidebarLayout role="sdr">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SidebarLayout>
    );
  }

  if (!prospect) {
    return (
      <SidebarLayout role="sdr">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-neutral-900">Prospect not found</h2>
          <p className="text-neutral-500 mt-2">
            The prospect you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => setLocation("/sdr/saved-prospects")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Saved Prospects
          </Button>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout role="sdr">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => setLocation("/sdr/saved-prospects")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Saved Prospects
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Prospect Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Prospect Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarFallback className="text-xl bg-primary-50 text-primary-600">
                  {getInitials(prospect.name)}
                </AvatarFallback>
              </Avatar>
              
              <h2 className="text-xl font-semibold text-neutral-900 text-center">{prospect.name}</h2>
              
              <div className="mt-1 text-center">
                <span className="text-sm text-neutral-600">{prospect.title}</span>
              </div>
              
              <div className="mt-1 text-center">
                <span className="text-sm font-medium text-neutral-900">{prospect.company}</span>
              </div>
              
              <div className="mt-4 flex items-center">
                {getChannelIcon(prospect.channelType)}
                <span className="ml-2 text-sm text-neutral-700">{prospect.channelName}</span>
              </div>
              
              <Button 
                className="mt-6 w-full"
                variant="outline"
                onClick={() => window.open(prospect.sourceLink, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Profile
              </Button>
            </div>
            
            <div className="mt-6 pt-6 border-t border-neutral-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-neutral-500">Status</span>
                <Badge className={getStageColor(prospect.stage)}>
                  {formatStage(prospect.stage)}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-neutral-500">Match Score</span>
                <span className="text-sm font-medium">{prospect.matchScore}%</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-500">Added On</span>
                <div className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1 text-neutral-400" />
                  <span className="text-sm text-neutral-700">
                    {formatDate(prospect.createdAt || new Date())}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Update Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Manage Relationship</CardTitle>
            <CardDescription>
              Track your progress with this prospect and update their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-1 block">Update Status</label>
                <Select
                  value={stage}
                  onValueChange={setStage}
                  disabled={updateProspectMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="connected">Connected</SelectItem>
                    <SelectItem value="meeting_scheduled">Meeting Scheduled</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="disqualified">Disqualified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Notes</label>
                <Textarea 
                  placeholder="Add notes about your interactions with this prospect..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={updateProspectMutation.isPending}
                  className="min-h-[150px]"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end bg-neutral-50">
            <Button
              onClick={handleSaveChanges}
              disabled={updateProspectMutation.isPending}
            >
              {updateProspectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>Save Changes</>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </SidebarLayout>
  );
}