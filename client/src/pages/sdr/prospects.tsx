import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import SidebarLayout from "@/components/layouts/sidebar-layout";
import { Prospect } from "@shared/schema";
import { ProspectTable } from "@/components/prospect/prospect-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Loader2 } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function Prospects() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [prospectStage, setProspectStage] = useState("");
  const [prospectNotes, setProspectNotes] = useState("");
  
  const { toast } = useToast();

  // Fetch user's prospects
  const {
    data: prospects,
    isLoading,
  } = useQuery<Prospect[]>({
    queryKey: ["/api/sdr/prospects"],
  });

  // Update prospect mutation
  const updateProspectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Prospect> }) => {
      const res = await apiRequest("PATCH", `/api/sdr/prospects/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sdr/prospects"] });
      setIsUpdateDialogOpen(false);
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

  // Filter prospects based on search term
  const filteredProspects = prospects?.filter(prospect => 
    prospect.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prospect.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prospect.company?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleUpdateProspect = () => {
    if (!selectedProspect) return;
    
    const updateData: Partial<Prospect> = {};
    if (prospectStage) updateData.stage = prospectStage as any;
    if (prospectNotes) updateData.notes = prospectNotes;
    
    updateProspectMutation.mutate({
      id: selectedProspect.id,
      data: updateData
    });
  };

  const openUpdateDialog = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setProspectStage(prospect.stage || "");
    setProspectNotes(prospect.notes || "");
    setIsUpdateDialogOpen(true);
  };

  return (
    <SidebarLayout role="sdr">
      <h1 className="text-2xl font-semibold text-neutral-900 mb-6">My Prospects</h1>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Prospect Management</CardTitle>
            <CardDescription>View and manage your saved prospects</CardDescription>
          </div>
          <div className="flex space-x-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search prospects..."
                className="pl-8 w-[250px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
            </div>
          ) : (
            <ProspectTable
              prospects={filteredProspects}
              title=""
              showSavedDate={true}
              showStage={true}
              emptyMessage="No prospects found. Go to the Prospect Search page to find and add prospects."
              onViewProfile={openUpdateDialog}
            />
          )}
        </CardContent>
      </Card>
      
      {/* Update Prospect Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Prospect</DialogTitle>
            <DialogDescription>
              Update status and add notes for {selectedProspect?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="stage">Stage</Label>
              <Select
                value={prospectStage}
                onValueChange={setProspectStage}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a stage" />
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
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add notes about this prospect"
                value={prospectNotes}
                onChange={(e) => setProspectNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleUpdateProspect}
              disabled={updateProspectMutation.isPending}
            >
              {updateProspectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Prospect'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarLayout>
  );
}
