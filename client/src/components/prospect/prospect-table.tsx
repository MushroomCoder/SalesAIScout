import { useState } from "react";
import { useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Prospect } from "@shared/schema";
import { 
  Linkedin,
  Twitter,
  Instagram,
  Search as SearchIcon,
  HelpCircle,
  ExternalLink
} from "lucide-react";
import { FaQuora } from "react-icons/fa";

interface AnalyzedProspect {
  id?: number;
  name: string;
  title: string;
  company: string;
  sourceLink: string;
  channelId: number;
  channelType: string;
  channelName: string;
  matchScore: number;
  stage?: string;
  createdAt?: Date;
}

interface ProspectTableProps {
  prospects: AnalyzedProspect[] | Prospect[];
  title: string;
  subtitle?: string;
  showCheckboxes?: boolean;
  showMatchScore?: boolean;
  showSaveButton?: boolean;
  isLoading?: boolean;
  onSaveSelected?: (prospects: AnalyzedProspect[]) => void;
  onViewProfile?: (prospect: AnalyzedProspect | Prospect) => void;
  showStage?: boolean;
  showSavedDate?: boolean;
  emptyMessage?: string;
}

export function ProspectTable({
  prospects,
  title,
  subtitle,
  showCheckboxes = false,
  showMatchScore = false,
  showSaveButton = false,
  isLoading = false,
  onSaveSelected,
  onViewProfile,
  showStage = false,
  showSavedDate = false,
  emptyMessage = "No prospects found",
}: ProspectTableProps) {
  const [selectedProspects, setSelectedProspects] = useState<(AnalyzedProspect | Prospect)[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedProspects([]);
    } else {
      setSelectedProspects([...prospects]);
    }
    setSelectAll(!selectAll);
  };

  const handleSelectProspect = (prospect: AnalyzedProspect | Prospect) => {
    if (selectedProspects.some(p => p.name === prospect.name)) {
      setSelectedProspects(selectedProspects.filter(p => p.name !== prospect.name));
      setSelectAll(false);
    } else {
      setSelectedProspects([...selectedProspects, prospect]);
      if (selectedProspects.length + 1 === prospects.length) {
        setSelectAll(true);
      }
    }
  };

  const isSelected = (prospect: AnalyzedProspect | Prospect) => {
    return selectedProspects.some(p => p.name === prospect.name);
  };

  const getChannelIcon = (channelType: string) => {
    switch (channelType) {
      case 'linkedin':
        return <Linkedin className="h-4 w-4 text-blue-600" />;
      case 'twitter':
        return <Twitter className="h-4 w-4 text-blue-500" />;
      case 'instagram':
        return <Instagram className="h-4 w-4 text-red-500" />;
      case 'quora':
        return <FaQuora className="h-4 w-4 text-red-700" />;
      case 'google':
        return <SearchIcon className="h-4 w-4 text-red-500" />;
      default:
        return <HelpCircle className="h-4 w-4 text-neutral-400" />;
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

  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 80) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    return 'bg-yellow-500';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const formatStage = (stage: string | undefined) => {
    if (!stage) return 'New';
    return stage.charAt(0).toUpperCase() + stage.slice(1).replace(/_/g, ' ');
  };

  const [, navigate] = useLocation();

  const navigateToDetails = (prospect: AnalyzedProspect | Prospect) => {
    // Only navigate to details if this is a saved prospect with an ID
    if (prospect.id) {
      navigate(`/sdr/prospect-details/${prospect.id}`);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          {subtitle && <CardDescription>{subtitle}</CardDescription>}
        </div>
        {showSaveButton && selectedProspects.length > 0 && (
          <Button 
            onClick={() => onSaveSelected?.(selectedProspects as AnalyzedProspect[])}
            disabled={isLoading}
          >
            Save {selectedProspects.length} Selected
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {prospects.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-neutral-500">{emptyMessage}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {showCheckboxes && (
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectAll}
                        onCheckedChange={handleSelectAll}
                        disabled={isLoading}
                      />
                    </TableHead>
                  )}
                  {showSavedDate && (
                    <TableHead>Date Added</TableHead>
                  )}
                  <TableHead>Name</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Channel</TableHead>
                  {showMatchScore && (
                    <TableHead>Match Score</TableHead>
                  )}
                  {showStage && (
                    <TableHead>Status</TableHead>
                  )}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prospects.map((prospect) => (
                  <TableRow 
                    key={prospect.name} 
                    className={prospect.id ? "cursor-pointer hover:bg-neutral-50" : ""}
                    onClick={() => prospect.id && navigateToDetails(prospect)}
                  >
                    {showCheckboxes && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          checked={isSelected(prospect)}
                          onCheckedChange={() => handleSelectProspect(prospect)}
                          disabled={isLoading}
                        />
                      </TableCell>
                    )}
                    {showSavedDate && (
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm text-neutral-500">
                          {formatDate(prospect.createdAt || new Date())}
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarFallback className="bg-neutral-100 text-neutral-800">
                            {getInitials(prospect.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-neutral-900">
                            {prospect.name}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-neutral-900">{prospect.title}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-neutral-900">{prospect.company}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {getChannelIcon(prospect.channelType)}
                        <span className="text-sm text-neutral-900 ml-2">
                          {prospect.channelName}
                        </span>
                      </div>
                    </TableCell>
                    {showMatchScore && (
                      <TableCell>
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-neutral-900">
                            {prospect.matchScore}%
                          </span>
                          <div className="ml-2 w-16 bg-neutral-200 rounded-full h-2">
                            <div 
                              className={`${getMatchScoreColor(prospect.matchScore)} h-2 rounded-full`} 
                              style={{ width: `${prospect.matchScore}%` }}
                            ></div>
                          </div>
                        </div>
                      </TableCell>
                    )}
                    {showStage && (
                      <TableCell>
                        <Badge className={getStageColor(prospect.stage)}>
                          {formatStage(prospect.stage)}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary-600 hover:text-primary-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(prospect.sourceLink, '_blank');
                          }}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View Profile
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
