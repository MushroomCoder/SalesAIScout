import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import SidebarLayout from "@/components/layouts/sidebar-layout";
import { ProspectSearchForm } from "@/components/prospect/prospect-search-form";
import { ProspectTable } from "@/components/prospect/prospect-table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Channel, SearchQuery } from "@shared/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AnalyzedProspect {
  name: string;
  title: string;
  company: string;
  sourceLink: string;
  channelId: number;
  channelType: string;
  channelName: string;
  matchScore: number;
}

export default function ProspectSearch() {
  const [searchResults, setSearchResults] = useState<AnalyzedProspect[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();

  // Fetch user's channels
  const {
    data: channels,
    isLoading: isLoadingChannels,
  } = useQuery<Channel[]>({
    queryKey: ["/api/sdr/channels"],
  });

  // Search mutation
  const searchMutation = useMutation({
    mutationFn: async (searchQuery: SearchQuery) => {
      const res = await apiRequest("POST", "/api/sdr/prospects/search", searchQuery);
      return res.json();
    },
    onSuccess: (data: AnalyzedProspect[]) => {
      setSearchResults(data);
      setHasSearched(true);
      
      if (data.length === 0) {
        toast({
          title: "No prospects found",
          description: "Try adjusting your search criteria to find more prospects.",
        });
      } else {
        toast({
          title: "Search completed",
          description: `Found ${data.length} potential prospects.`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Search failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Save prospects mutation
  const saveProspectsMutation = useMutation({
    mutationFn: async (prospects: AnalyzedProspect[]) => {
      const res = await apiRequest("POST", "/api/sdr/prospects", prospects);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sdr/prospects"] });
      toast({
        title: "Prospects saved",
        description: "The selected prospects have been saved to your list.",
      });
    },
    onError: (error) => {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSearchSubmit = (searchQuery: SearchQuery) => {
    searchMutation.mutate(searchQuery);
  };

  const handleSaveProspects = (selectedProspects: AnalyzedProspect[]) => {
    saveProspectsMutation.mutate(selectedProspects);
  };

  return (
    <SidebarLayout role="sdr">
      <h1 className="text-2xl font-semibold text-neutral-900 mb-6">AI-Powered Prospect Search</h1>
      
      {/* Search Form */}
      <ProspectSearchForm 
        onSubmit={handleSearchSubmit}
        isLoading={searchMutation.isPending}
      />
      
      {/* No channels warning */}
      {channels && channels.length === 0 && (
        <Alert variant="destructive" className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No channels available</AlertTitle>
          <AlertDescription>
            You don't have any channels assigned to your account. Please contact your administrator to get access to prospecting channels.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Search Results */}
      {hasSearched && (
        <div className="mt-8">
          <ProspectTable
            prospects={searchResults}
            title="Search Results"
            subtitle={`Showing ${searchResults.length} prospects`}
            showCheckboxes={true}
            showMatchScore={true}
            showSaveButton={true}
            isLoading={saveProspectsMutation.isPending}
            onSaveSelected={handleSaveProspects}
            emptyMessage="No prospects found. Try adjusting your search criteria."
          />
        </div>
      )}
    </SidebarLayout>
  );
}
