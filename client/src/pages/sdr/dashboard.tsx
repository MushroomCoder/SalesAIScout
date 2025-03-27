import { useQuery } from "@tanstack/react-query";
import SidebarLayout from "@/components/layouts/sidebar-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Channel, Prospect } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { 
  BarChart,
  BarChart2,
  Calendar,
  Search,
  UserSearch,
  Mail,
  Phone,
  Clock,
  ArrowUpRight,
  Loader2
} from "lucide-react";
import { Link } from "wouter";
import { ProspectTable } from "@/components/prospect/prospect-table";

export default function SDRDashboard() {
  const { user } = useAuth();

  // Fetch user's channels
  const {
    data: channels,
    isLoading: isLoadingChannels,
  } = useQuery<Channel[]>({
    queryKey: ["/api/sdr/channels"],
  });

  // Fetch user's prospects
  const {
    data: prospects,
    isLoading: isLoadingProspects,
  } = useQuery<Prospect[]>({
    queryKey: ["/api/sdr/prospects"],
  });

  // Filter recent prospects (last 3)
  const recentProspects = prospects?.slice(0, 3) || [];

  // Stats calculation (mock data for now)
  const stats = {
    totalProspects: prospects?.length || 0,
    newProspectsWeekly: 12,
    responseRate: 42,
    outreachCount: 28,
    pendingTasks: 5,
    upcomingMeetings: 2
  };

  return (
    <SidebarLayout role="sdr">
      <h1 className="text-2xl font-semibold text-neutral-900 mb-2">Welcome, {user?.username}</h1>
      <p className="text-neutral-500 mb-6">Here's an overview of your prospecting activity</p>
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="bg-primary-100 p-3 rounded-md">
                <UserSearch className="h-6 w-6 text-primary-600" />
              </div>
              <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                +{stats.newProspectsWeekly} this week
              </div>
            </div>
            <h3 className="mt-4 text-2xl font-semibold">{stats.totalProspects}</h3>
            <p className="text-neutral-500 text-sm">Total Prospects</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="bg-primary-100 p-3 rounded-md">
                <Mail className="h-6 w-6 text-primary-600" />
              </div>
            </div>
            <h3 className="mt-4 text-2xl font-semibold">{stats.outreachCount}</h3>
            <p className="text-neutral-500 text-sm">Outreach Emails Sent</p>
            <div className="mt-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-neutral-500">Response Rate</span>
                <span className="text-xs font-medium text-primary-600">{stats.responseRate}%</span>
              </div>
              <Progress value={stats.responseRate} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="bg-primary-100 p-3 rounded-md">
                <Clock className="h-6 w-6 text-primary-600" />
              </div>
            </div>
            <h3 className="mt-4 text-2xl font-semibold">{stats.pendingTasks}</h3>
            <p className="text-neutral-500 text-sm">Pending Tasks</p>
            <div className="mt-3">
              <Button variant="outline" size="sm" className="w-full">
                <ArrowUpRight className="h-4 w-4 mr-2" />
                View Tasks
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="bg-primary-100 p-3 rounded-md">
                <Calendar className="h-6 w-6 text-primary-600" />
              </div>
            </div>
            <h3 className="mt-4 text-2xl font-semibold">{stats.upcomingMeetings}</h3>
            <p className="text-neutral-500 text-sm">Upcoming Meetings</p>
            <div className="mt-3">
              <Button variant="outline" size="sm" className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule New
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions & Recent Prospects */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Quick Actions */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Start your prospecting activities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/sdr/search">
              <Button className="w-full justify-start">
                <Search className="mr-2 h-4 w-4" />
                Find New Prospects
              </Button>
            </Link>
            <Link href="/sdr/prospects">
              <Button variant="outline" className="w-full justify-start">
                <UserSearch className="mr-2 h-4 w-4" />
                Manage Prospects
              </Button>
            </Link>
            <Button variant="outline" className="w-full justify-start">
              <Mail className="mr-2 h-4 w-4" />
              Send Campaign
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Phone className="mr-2 h-4 w-4" />
              Log Call
            </Button>
          </CardContent>
        </Card>

        {/* Recent Prospects */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recent Prospects</CardTitle>
            <CardDescription>Your recently added prospects</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingProspects ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
              </div>
            ) : recentProspects.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-neutral-500">No prospects found</p>
                <Link href="/sdr/search">
                  <Button className="mt-4">Find Prospects</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentProspects.map((prospect) => (
                  <div key={prospect.id} className="flex items-center justify-between border-b border-neutral-200 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-700">
                        <span className="font-medium">
                          {prospect.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <h4 className="text-sm font-medium text-neutral-900">{prospect.name}</h4>
                        <p className="text-xs text-neutral-500">{prospect.title} at {prospect.company}</p>
                      </div>
                    </div>
                    <Badge className={
                      prospect.stage === 'contacted' ? "bg-blue-100 text-blue-800" :
                      prospect.stage === 'connected' ? "bg-green-100 text-green-800" :
                      "bg-neutral-100 text-neutral-800"
                    }>
                      {prospect.stage?.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-neutral-50 border-t border-neutral-200">
            <Link href="/sdr/prospects" className="w-full">
              <Button variant="outline" className="w-full">
                View All Prospects
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>

      {/* Analytics & Performance */}
      <Card>
        <CardHeader>
          <Tabs defaultValue="weekly">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center">
                <BarChart2 className="mr-2 h-5 w-5" />
                Performance Analytics
              </CardTitle>
              <TabsList>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly">Yearly</TabsTrigger>
              </TabsList>
            </div>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-center">
              <BarChart className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-500">Analytics data will appear here</p>
              <p className="text-sm text-neutral-400">Start adding more prospects to see your performance</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </SidebarLayout>
  );
}
