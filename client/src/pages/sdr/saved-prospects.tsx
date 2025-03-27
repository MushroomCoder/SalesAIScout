import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import SidebarLayout from "@/components/layouts/sidebar-layout";
import { ProspectTable } from "@/components/prospect/prospect-table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Select, 
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Prospect, prospectStageEnum } from "@shared/schema";
import { Loader2, RotateCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SavedProspects() {
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const { toast } = useToast();

  // Fetch user's prospects
  const {
    data: prospects,
    isLoading: isLoadingProspects,
    refetch
  } = useQuery<Prospect[]>({
    queryKey: ["/api/sdr/prospects"],
  });

  // Update prospect stage mutation
  const updateProspectMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: number; stage: string }) => {
      const res = await apiRequest("PATCH", `/api/sdr/prospects/${id}`, { stage });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sdr/prospects"] });
      toast({
        title: "Prospect updated",
        description: "The prospect status has been updated successfully.",
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

  const handleUpdateStage = (prospect: Prospect, stage: string) => {
    updateProspectMutation.mutate({ id: prospect.id!, stage });
  };

  const filteredProspects = prospects 
    ? (selectedStage !== "all"
        ? prospects.filter(p => p.stage === selectedStage)
        : prospects)
    : [];

  const stageOptions = [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'connected', label: 'Connected' },
    { value: 'meeting_scheduled', label: 'Meeting Scheduled' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'disqualified', label: 'Disqualified' },
  ];

  return (
    <SidebarLayout role="sdr">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">Saved Prospects</h1>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isLoadingProspects}
        >
          {isLoadingProspects ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RotateCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Manage Your Prospects</CardTitle>
          <CardDescription>
            Track and update the status of your saved prospects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            <div className="w-full sm:w-64">
              <label className="text-sm font-medium mb-1 block">Filter by stage</label>
              <Select
                value={selectedStage}
                onValueChange={(value) => setSelectedStage(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stages</SelectItem>
                  {stageOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1"></div>
            <div className="text-sm text-neutral-500">
              {filteredProspects.length} {filteredProspects.length === 1 ? 'prospect' : 'prospects'} 
              {selectedStage !== "all" 
                ? ` in ${stageOptions.find(o => o.value === selectedStage)?.label} stage` 
                : ' total'}
            </div>
          </div>
        </CardContent>
      </Card>

      <ProspectTable
        prospects={filteredProspects}
        title="Your Prospects"
        subtitle="Update the status as you engage with these prospects"
        showStage={true}
        showSavedDate={true}
        isLoading={isLoadingProspects || updateProspectMutation.isPending}
        emptyMessage={selectedStage !== "all"
          ? `No prospects in the ${stageOptions.find(o => o.value === selectedStage)?.label} stage` 
          : "You haven't saved any prospects yet. Search for prospects to add them to your list."
        }
      />
    </SidebarLayout>
  );
}