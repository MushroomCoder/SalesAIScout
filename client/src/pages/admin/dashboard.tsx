import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import SidebarLayout from "@/components/layouts/sidebar-layout";
import { OverviewCards } from "@/components/admin/overview-cards";
import { SDRApprovalTable } from "@/components/admin/sdr-approval-table";
import { ChannelManagement } from "@/components/admin/channel-management";
import { User, Channel } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboard() {
  // Fetch pending SDRs
  const {
    data: pendingSDRs,
    isLoading: isLoadingPendingSDRs,
  } = useQuery<User[]>({
    queryKey: ["/api/admin/sdrs/pending"],
  });

  // Fetch all SDRs
  const {
    data: allSDRs,
    isLoading: isLoadingAllSDRs,
  } = useQuery<User[]>({
    queryKey: ["/api/admin/sdrs"],
  });

  // Fetch all channels
  const {
    data: channels,
    isLoading: isLoadingChannels,
  } = useQuery<Channel[]>({
    queryKey: ["/api/admin/channels"],
  });

  // Fetch all prospects
  const {
    data: prospects,
    isLoading: isLoadingProspects,
  } = useQuery({
    queryKey: ["/api/admin/prospects"],
  });

  const dashboardData = {
    totalSDRs: allSDRs?.length || 0,
    pendingApprovals: pendingSDRs?.length || 0,
    activeChannels: channels?.filter(c => c.isActive).length || 0,
    totalProspects: prospects?.length || 0,
  };

  const isLoading = 
    isLoadingPendingSDRs || 
    isLoadingAllSDRs || 
    isLoadingChannels || 
    isLoadingProspects;

  return (
    <SidebarLayout role="admin">
      <h1 className="text-2xl font-semibold text-neutral-900 mb-6">Dashboard</h1>
      
      {/* Overview Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      ) : (
        <OverviewCards data={dashboardData} />
      )}
      
      {/* SDR Approval Requests */}
      <div className="mt-8">
        {isLoadingPendingSDRs ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <SDRApprovalTable pendingSDRs={pendingSDRs || []} isLoading={isLoadingPendingSDRs} />
        )}
      </div>
      
      {/* Channel Management */}
      <div className="mt-8">
        {isLoadingChannels ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <ChannelManagement channels={channels || []} isLoading={isLoadingChannels} />
        )}
      </div>
    </SidebarLayout>
  );
}
