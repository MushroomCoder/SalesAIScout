import { useQuery } from "@tanstack/react-query";
import SidebarLayout from "@/components/layouts/sidebar-layout";
import { Channel } from "@shared/schema";
import { ChannelManagement } from "@/components/admin/channel-management";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminChannels() {
  // Fetch all channels
  const {
    data: channels,
    isLoading: isLoadingChannels,
  } = useQuery<Channel[]>({
    queryKey: ["/api/admin/channels"],
  });

  return (
    <SidebarLayout role="admin">
      <h1 className="text-2xl font-semibold text-neutral-900 mb-6">Channel Management</h1>
      
      {isLoadingChannels ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      ) : (
        <ChannelManagement channels={channels || []} />
      )}
    </SidebarLayout>
  );
}
