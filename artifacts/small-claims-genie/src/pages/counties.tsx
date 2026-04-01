import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useListCounties } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Phone, Globe, Landmark, Search } from "lucide-react";
import { i18n } from "@/lib/i18n";

export default function Counties() {
  const { data: counties, isLoading, isError } = useListCounties();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCounties = useMemo(() => {
    if (!counties) return [];
    if (!searchTerm) return counties;
    const lower = searchTerm.toLowerCase();
    return counties.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        c.courthouseName.toLowerCase().includes(lower) ||
        c.courthouseCity.toLowerCase().includes(lower)
    );
  }, [counties, searchTerm]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">{i18n.counties.title || "California Counties"}</h1>
        <p className="text-muted-foreground text-lg mb-6">
          Find your local small claims courthouse, filing fees, and contact information.
          Filing in the correct county is critical for your case to be heard.
        </p>
        
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder={i18n.counties.searchPlaceholder || "Search counties..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 text-base"
            data-testid="input-county-search"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-1/2 mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <div className="p-8 text-center bg-destructive/10 text-destructive rounded-lg">
          <p>Failed to load counties. Please try again later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCounties.map((county) => (
            <Card key={county.id} data-testid={`card-county-${county.id}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-primary" />
                  {county.name} County
                </CardTitle>
                <CardDescription className="font-medium text-foreground">
                  {county.courthouseName}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm space-y-2">
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                      {county.courthouseAddress}<br />
                      {county.courthouseCity}, CA {county.courthouseZip}
                    </span>
                  </div>
                  
                  {county.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      <a href={`tel:${county.phone}`} className="hover:text-primary hover:underline">
                        {county.phone}
                      </a>
                    </div>
                  )}
                  
                  {county.website && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="h-4 w-4 shrink-0" />
                      <a 
                        href={county.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-primary hover:underline truncate"
                      >
                        Court Website
                      </a>
                    </div>
                  )}
                </div>

                <div className="bg-muted/50 rounded-md p-3 text-sm">
                  <h4 className="font-semibold mb-2">{i18n.counties.filingFees || "Filing Fees"}</h4>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">{i18n.counties.under1500 || "Under $1.5k"}</div>
                      <div className="font-medium">${county.filingFeeUnder1500 || 30}</div>
                    </div>
                    <div className="border-x border-border/50">
                      <div className="text-xs text-muted-foreground mb-1">{i18n.counties.upTo5000 || "$1.5k-$5k"}</div>
                      <div className="font-medium">${county.filingFee1500to5000 || 50}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">{i18n.counties.over5000 || "Over $5k"}</div>
                      <div className="font-medium">${county.filingFeeOver5000 || 75}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredCounties.length === 0 && (
            <div className="col-span-full p-12 text-center text-muted-foreground bg-muted/30 rounded-lg">
              No counties found matching "{searchTerm}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
