import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Users, UserPlus, Link, UserSearch, TrendingUp } from "lucide-react";
import { Link as RouterLink } from "wouter";

interface OverviewCard {
  title: string;
  value: number;
  icon: React.ReactNode;
  iconColor: string;
  change?: {
    value: number;
    isPositive: boolean;
  };
  linkText: string;
  linkHref: string;
}

interface OverviewCardsProps {
  data: {
    totalSDRs: number;
    pendingApprovals: number;
    activeChannels: number;
    totalProspects: number;
  };
}

export function OverviewCards({ data }: OverviewCardsProps) {
  const cards: OverviewCard[] = [
    {
      title: "Total SDRs",
      value: data.totalSDRs,
      icon: <Users />,
      iconColor: "text-primary-600",
      linkText: "View all",
      linkHref: "/admin/sdrs"
    },
    {
      title: "Pending Approvals",
      value: data.pendingApprovals,
      icon: <UserPlus />,
      iconColor: "text-primary-600",
      linkText: "Approve now",
      linkHref: "/admin/sdrs"
    },
    {
      title: "Active Channels",
      value: data.activeChannels,
      icon: <Link />,
      iconColor: "text-primary-600",
      linkText: "Manage channels",
      linkHref: "/admin/channels"
    },
    {
      title: "Total Prospects",
      value: data.totalProspects,
      icon: <UserSearch />,
      iconColor: "text-primary-600",
      change: {
        value: 12,
        isPositive: true
      },
      linkText: "View all",
      linkHref: "/admin/prospects"
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <Card key={index} className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className={`flex-shrink-0 bg-primary-100 rounded-md p-3 ${card.iconColor}`}>
                {card.icon}
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-neutral-500 truncate">{card.title}</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-neutral-900">{card.value}</div>
                    {card.change && (
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                        card.change.isPositive ? "text-green-600" : "text-red-600"
                      }`}>
                        {card.change.isPositive ? (
                          <TrendingUp className="h-4 w-4 mr-1" />
                        ) : (
                          <TrendingUp className="h-4 w-4 mr-1 transform rotate-180" />
                        )}
                        <span className="sr-only">
                          {card.change.isPositive ? "Increased by" : "Decreased by"}
                        </span>
                        {card.change.value}%
                      </div>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-neutral-50 px-5 py-3">
            <div className="text-sm">
              <RouterLink href={card.linkHref} className="font-medium text-primary-600 hover:text-primary-500">
                {card.linkText}
              </RouterLink>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
