import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Check, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SDRApprovalTableProps {
  pendingSDRs: User[];
  isLoading?: boolean;
}

export function SDRApprovalTable({ pendingSDRs, isLoading = false }: SDRApprovalTableProps) {
  const [processingIds, setProcessingIds] = useState<number[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'approved' | 'rejected' }) => {
      const res = await apiRequest("POST", `/api/admin/sdrs/${id}/status`, { status });
      return res.json();
    },
    onMutate: ({ id }) => {
      setProcessingIds((prev) => [...prev, id]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sdrs/pending"] });
      toast({
        title: "Status updated",
        description: "The SDR status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: ({ id }) => {
      setProcessingIds((prev) => prev.filter((currentId) => currentId !== id));
    },
  });

  const approveAll = async () => {
    try {
      const promises = pendingSDRs.map((sdr) => 
        updateStatusMutation.mutateAsync({ id: sdr.id, status: 'approved' })
      );
      await Promise.all(promises);
      toast({
        title: "All SDRs approved",
        description: "All pending SDRs have been approved successfully.",
      });
    } catch (error) {
      toast({
        title: "Approval failed",
        description: "Failed to approve all SDRs. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

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

  const isProcessing = (id: number) => processingIds.includes(id);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>SDR Approval Requests</CardTitle>
          <CardDescription>Review and approve new SDR account requests</CardDescription>
        </div>
        {pendingSDRs.length > 0 && (
          <Button onClick={approveAll} disabled={isLoading || updateStatusMutation.isPending}>
            {(isLoading || updateStatusMutation.isPending) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Approve All'
            )}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {pendingSDRs.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-neutral-500">No pending approval requests</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Requested On</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingSDRs.map((sdr) => (
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
                      <Badge className="bg-yellow-100 text-yellow-800">
                        Pending
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ id: sdr.id, status: 'approved' })}
                          disabled={isLoading || isProcessing(sdr.id)}
                          className="bg-primary-700 hover:bg-primary-800"
                        >
                          {isProcessing(sdr.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ id: sdr.id, status: 'rejected' })}
                          disabled={isLoading || isProcessing(sdr.id)}
                          className="text-neutral-700 border-neutral-300"
                        >
                          {isProcessing(sdr.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </>
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
