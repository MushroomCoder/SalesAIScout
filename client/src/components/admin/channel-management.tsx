import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Users } from "lucide-react";
import { 
  FaLinkedinIn, 
  FaTwitter, 
  FaInstagram, 
  FaQuora, 
  FaGoogle 
} from "react-icons/fa";
import { Channel } from "@shared/schema";

interface ChannelManagementProps {
  channels: Channel[];
  isLoading?: boolean;
}

export function ChannelManagement({ channels, isLoading = false }: ChannelManagementProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newChannel, setNewChannel] = useState({
    name: "",
    type: "",
    description: "",
    isActive: true
  });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createChannelMutation = useMutation({
    mutationFn: async (channel: Omit<Channel, "id" | "createdAt">) => {
      const res = await apiRequest("POST", "/api/admin/channels", channel);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/channels"] });
      toast({
        title: "Channel created",
        description: "The channel has been created successfully.",
      });
      setIsDialogOpen(false);
      setNewChannel({
        name: "",
        type: "",
        description: "",
        isActive: true
      });
    },
    onError: (error) => {
      toast({
        title: "Creation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateChannelMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Channel> }) => {
      const res = await apiRequest("PATCH", `/api/admin/channels/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/channels"] });
      toast({
        title: "Channel updated",
        description: "The channel has been updated successfully.",
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

  const handleCreateChannel = () => {
    createChannelMutation.mutate(newChannel);
  };

  const toggleChannelStatus = (channel: Channel) => {
    updateChannelMutation.mutate({
      id: channel.id,
      data: { isActive: !channel.isActive }
    });
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'linkedin':
        return <FaLinkedinIn className="text-blue-600 text-2xl" />;
      case 'twitter':
        return <FaTwitter className="text-blue-500 text-2xl" />;
      case 'instagram':
        return <FaInstagram className="text-red-500 text-2xl" />;
      case 'quora':
        return <FaQuora className="text-red-700 text-2xl" />;
      case 'google':
        return <FaGoogle className="text-red-500 text-2xl" />;
      default:
        return <FaLinkedinIn className="text-blue-600 text-2xl" />;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-neutral-900">Channel Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Channel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Channel</DialogTitle>
              <DialogDescription>
                Create a new prospecting channel for SDRs to use in their searches.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Channel Name</Label>
                <Input
                  id="name"
                  value={newChannel.name}
                  onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                  placeholder="LinkedIn, Twitter, etc."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Channel Type</Label>
                <Select
                  value={newChannel.type}
                  onValueChange={(value) => setNewChannel({ ...newChannel, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select channel type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="twitter">Twitter</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="quora">Quora</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newChannel.description}
                  onChange={(e) => setNewChannel({ ...newChannel, description: e.target.value })}
                  placeholder="Brief description of the channel"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={handleCreateChannel}
                disabled={!newChannel.name || !newChannel.type || createChannelMutation.isPending}
              >
                {createChannelMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Channel'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="flex items-center justify-center col-span-full py-10">
            <Loader2 className="h-6 w-6 animate-spin mr-3" />
            <span>Loading channels...</span>
          </div>
        ) : channels.length === 0 ? (
          <div className="col-span-full text-center py-10">
            <p className="text-neutral-500">No channels found. Create your first channel!</p>
          </div>
        ) : (
          channels.map((channel) => (
            <Card key={channel.id} className="overflow-hidden">
              <CardHeader className="px-6 py-5 flex flex-row items-center space-y-0">
                <div className="flex-shrink-0 h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  {getChannelIcon(channel.type)}
                </div>
                <div className="ml-4 flex-1">
                  <CardTitle className="text-lg">{channel.name}</CardTitle>
                  <CardDescription>{channel.description}</CardDescription>
                </div>
                <div className="ml-4">
                  <Badge className={channel.isActive ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-800"}>
                    {channel.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-6 py-4">
                <div className="text-sm text-neutral-700">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2 text-neutral-500" />
                    <p>SDRs assigned: <span className="font-medium">0</span></p>
                  </div>
                  <p className="mt-1">Prospects found: <span className="font-medium">0</span></p>
                </div>
              </CardContent>
              <CardFooter className="px-6 py-4 bg-neutral-50 flex justify-between">
                <Button
                  variant="ghost"
                  className="text-sm font-medium text-primary-600 hover:text-primary-500"
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  className="text-sm font-medium text-neutral-700 hover:text-neutral-500"
                  onClick={() => toggleChannelStatus(channel)}
                  disabled={updateChannelMutation.isPending}
                >
                  {channel.isActive ? "Disable" : "Enable"}
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
