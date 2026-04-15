import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Users, Trophy, Calendar, ArrowLeft, Search, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  competitionRegistrationService, 
  CompetitionRegistration 
} from "@/services/competitionRegistrationService";
import { Competition } from "@/services/competitionService";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  upcoming: "bg-blue-500/10 text-blue-500",
  ongoing: "bg-green-500/10 text-green-500",
  ended: "bg-orange-500/10 text-orange-500",
};

const registrationStatusColors: Record<string, string> = {
  active: "bg-green-500/10 text-green-500",
  disqualified: "bg-destructive/10 text-destructive",
  withdrawn: "bg-muted text-muted-foreground",
};

export default function Registrations() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch competitions list
  const { data: competitions, isLoading: competitionsLoading, refetch: refetchCompetitions } = useQuery({
    queryKey: ["competition-list", statusFilter],
    queryFn: () => competitionRegistrationService.getCompetitions(
      statusFilter === "all" ? undefined : statusFilter
    ),
    staleTime: 2 * 60 * 1000,
  });

  // Fetch registrations for selected competition
  const { data: registrationsData, isLoading: registrationsLoading, refetch: refetchRegistrations } = useQuery({
    queryKey: ["competition-registrations", selectedCompetition?.id],
    queryFn: () => competitionRegistrationService.getRegistrations(selectedCompetition!.id),
    enabled: !!selectedCompetition,
    staleTime: 1 * 60 * 1000,
  });

  const filteredRegistrations = registrationsData?.registrations.filter((reg) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      reg.trader_name.toLowerCase().includes(query) ||
      reg.trader_email.toLowerCase().includes(query) ||
      reg.mt5_login?.includes(query)
    );
  });

  const formatCurrency = (value: string | null) => {
    if (!value) return "-";
    return `$${parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  if (selectedCompetition) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedCompetition(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{registrationsData?.competition || selectedCompetition.title}</h1>
              <p className="text-sm text-muted-foreground">
                {registrationsData?.total_registrations || 0} registrations
              </p>
            </div>
          </div>
          <div className="sm:ml-auto">
            <Button variant="outline" size="sm" onClick={() => refetchRegistrations()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or MT5 login..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trader</TableHead>
                  <TableHead>MT5 Login</TableHead>
                  <TableHead className="text-right">Initial Balance</TableHead>
                  <TableHead className="text-right">Current Balance</TableHead>
                  <TableHead className="text-right">Live Equity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrationsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredRegistrations?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No registrations found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRegistrations?.map((registration) => (
                    <TableRow key={registration.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{registration.trader_name}</p>
                          <p className="text-sm text-muted-foreground">{registration.trader_email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{registration.mt5_login || "-"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(registration.mt5_initial_balance)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(registration.mt5_current_balance)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(registration.mt5_live_equity)}</TableCell>
                      <TableCell>
                        <Badge className={registrationStatusColors[registration.status] || "bg-muted"}>
                          {registration.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(registration.joined_at), "MMM d, yyyy HH:mm")}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Competition Registrations</h1>
          <p className="text-sm text-muted-foreground">View and manage competition registrations</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchCompetitions()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-background border">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="ongoing">Ongoing</SelectItem>
            <SelectItem value="ended">Ended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {competitionsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : competitions?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">No competitions found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {competitions?.map((competition) => (
            <Card 
              key={competition.id} 
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedCompetition(competition)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-1">{competition.title}</CardTitle>
                  <Badge className={statusColors[competition.status]}>
                    {competition.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{competition.max_participants} max participants</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Trophy className="h-4 w-4" />
                  <span>{competition.prize_pool_text}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(competition.start_at), "MMM d")} - {format(new Date(competition.end_at), "MMM d, yyyy")}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
