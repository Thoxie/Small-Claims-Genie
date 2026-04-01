import { i18n } from "@/lib/i18n";
import { useListCases, useGetCaseStats } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Briefcase, DollarSign, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: cases, isLoading: loadingCases } = useListCases();
  const { data: stats, isLoading: loadingStats } = useGetCaseStats();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {i18n.dashboard.title}
        </h1>
        <Button asChild size="lg" className="w-full sm:w-auto h-12 bg-primary">
          <Link href="/cases/new">
            <Plus className="mr-2 h-5 w-5" />
            {i18n.dashboard.newCaseBtn}
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {i18n.dashboard.totalCases}
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold">{stats?.total || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {i18n.dashboard.totalSought}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-3xl font-bold">${stats?.totalClaimAmount?.toLocaleString() || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {i18n.dashboard.avgReadiness}
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold">{stats?.avgReadinessScore || 0}%</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{i18n.dashboard.recentActivity}</h2>
        {loadingCases ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : cases && cases.length > 0 ? (
          <div className="grid gap-4">
            {cases.map((c) => (
              <Link key={c.id} href={`/cases/${c.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                  <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                        {c.title}
                      </h3>
                      <div className="text-sm text-muted-foreground mt-1">
                        Updated {format(new Date(c.updatedAt), "MMM d, yyyy")}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right mr-2">
                        <div className="text-sm font-medium">Readiness</div>
                        <div className={`text-lg font-bold ${c.readinessScore && c.readinessScore > 79 ? 'text-green-600' : c.readinessScore && c.readinessScore > 49 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {c.readinessScore || 0}%
                        </div>
                      </div>
                      <Badge variant={c.status === 'filed' ? 'default' : 'secondary'} className="h-8 px-3">
                        {c.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center border-dashed">
            <div className="flex flex-col items-center gap-4">
              <Briefcase className="h-12 w-12 text-muted-foreground/30" />
              <div className="text-lg text-muted-foreground">{i18n.dashboard.noCases}</div>
              <Button asChild className="mt-2">
                <Link href="/cases/new">Start a Case</Link>
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
