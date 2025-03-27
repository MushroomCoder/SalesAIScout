import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import SidebarLayout from "@/components/layouts/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Channel } from "@shared/schema";
import { Loader2, Search, Filter, UserPlus } from "lucide-react";
import { SDRApprovalTable } from "@/components/admin/sdr-approval-table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter,
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function SDRManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isChannelDialogOpen, setIsChannelDialogOpen] = useState(false);
  const [selectedSDR, setSelectedSDR] = useState<User | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all SDRs
  const {
    data: sdrs,
    isLoading: isLoadingSDRs,
  } = useQuery<User[]>({
    queryKey: ["/api/admin/sdrs"],
  });

  // Fetch pending SDRs
  const {
    data: pendingSDRs,
    isLoading: isLoadingPendingSDRs,
  } = useQuery<User[]>({
    queryKey: ["/api/admin/sdrs/pending"],
  });

  // Fetch all channels
  const {
    data: channels,
    isLoading: isLoadingChannels,
  } = useQuery<Channel[]>({
    queryKey: ["/api/admin/channels"],
  });

  // Assign channel mutation
  const assignChannelMutation = useMutation({
    mutationFn: async ({ userId, channelId }: { userId: number; channelId: number }) => {
      const res = await apiRequest("POST", `/api/admin/sdrs/${userId}/channels/${channelId}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sdrs"] });
      setIsChannelDialogOpen(false);
      toast({
        title: "Channel assigned",
        description: "The channel has been assigned to the SDR successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Assignment failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAssignChannel = () => {
    if (!selectedSDR || !selectedChannel) return;
    
    assignChannelMutation.mutate({
      userId: selectedSDR.id,
      channelId: parseInt(selectedChannel)
    });
  };

  // Filter SDRs based on search term
  const filteredSDRs = sdrs?.filter(sdr => 
    sdr.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sdr.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get SDR initials for avatar
  const getInitials = (email: string) => {
    // Create initials from email or username
    if (!email) return "UN";
    
    const name = email.split('@')[0]; // Use part before @ in email
    if (name.includes('.')) {
      // If name has dots, use first letter of each part
      return name.split('.').map(part => part[0]).join('').toUpperCase().substring(0, 2);
    }
    
    // Otherwise just use first two letters
    return name.substring(0, 2).toUpperCase();
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  return (
    <SidebarLayout role="admin">
      <h1 className="text-2xl font-semibold text-neutral-900 mb-6">SDR Management</h1>
      
      {/* Pending Approvals */}
      {pendingSDRs && pendingSDRs.length > 0 && (
        <div className="mb-8">
          <SDRApprovalTable pendingSDRs={pendingSDRs} isLoading={isLoadingPendingSDRs} />
        </div>
      )}
      
      {/* SDR List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>SDR Team</CardTitle>
            <CardDescription>Manage your Sales Development Representatives</CardDescription>
          </div>
          <div className="flex space-x-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search SDRs..."
                className="pl-8 w-[250px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add SDR
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingSDRs ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            </div>
          ) : filteredSDRs && filteredSDRs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned Channels</TableHead>
                    <TableHead>Prospects</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSDRs.map((sdr) => (
                    <TableRow key={sdr.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarFallback className="bg-neutral-100 text-neutral-700">
                              {getInitials(sdr.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-neutral-900">
                              {sdr.username}
                            </div>
                            {sdr.team && (
                              <div className="text-sm text-neutral-500">
                                {sdr.team}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-neutral-900">{sdr.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-neutral-500">
                          {formatDate(sdr.createdAt || new Date())}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          sdr.status === 'approved' 
                            ? "bg-green-100 text-green-800" 
                            : sdr.status === 'pending'
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }>
                          {sdr.status.charAt(0).toUpperCase() + sdr.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-neutral-900">
                          <Dialog open={isChannelDialogOpen} onOpenChange={setIsChannelDialogOpen}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setSelectedSDR(sdr)}
                              >
                                Assign Channel
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Assign Channel to SDR</DialogTitle>
                                <DialogDescription>
                                  Select a channel to assign to {selectedSDR?.username}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="py-4">
                                <Select
                                  value={selectedChannel}
                                  onValueChange={setSelectedChannel}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a channel" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {channels?.map(channel => (
                                      <SelectItem key={channel.id} value={channel.id.toString()}>
                                        {channel.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <DialogFooter>
                                <Button 
                                  onClick={handleAssignChannel}
                                  disabled={!selectedChannel || assignChannelMutation.isPending}
                                >
                                  {assignChannelMutation.isPending ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Assigning...
                                    </>
                                  ) : (
                                    'Assign Channel'
                                  )}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-neutral-900">0</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-neutral-500">No SDRs found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </SidebarLayout>
  );
}
