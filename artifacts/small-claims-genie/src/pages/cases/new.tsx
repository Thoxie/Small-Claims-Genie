import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useListCounties, useCreateCase } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { i18n } from "@/lib/i18n";

const newCaseSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  claimType: z.string().min(1, "Please select a claim type"),
  countyId: z.string().min(1, "Please select a county"),
});

type NewCaseFormValues = z.infer<typeof newCaseSchema>;

const CLAIM_TYPES = [
  "Money Owed",
  "Unpaid Debt",
  "Security Deposit",
  "Property Damage",
  "Contract Dispute",
  "Fraud",
  "Other"
];

export default function NewCase() {
  const [, setLocation] = useLocation();
  const { data: counties, isLoading: countiesLoading } = useListCounties();
  const createCase = useCreateCase();

  const form = useForm<NewCaseFormValues>({
    resolver: zodResolver(newCaseSchema),
    defaultValues: {
      title: "",
      claimType: "",
      countyId: "",
    },
  });

  const onSubmit = (data: NewCaseFormValues) => {
    createCase.mutate(
      { data },
      {
        onSuccess: (newCase) => {
          setLocation(`/cases/${newCase.id}`);
        },
      }
    );
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Card className="border-2 shadow-lg">
        <CardHeader className="pb-6 border-b bg-muted/20">
          <CardTitle className="text-3xl">{i18n.newCase.title}</CardTitle>
          <CardDescription className="text-base text-muted-foreground mt-2">
            Let's get started with the basics. You can always change this later.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">{i18n.newCase.caseTitleLabel}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Unpaid Rent from John Smith" 
                        className="h-14 text-lg" 
                        data-testid="input-case-title"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="claimType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">{i18n.newCase.claimTypeLabel}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-14 text-lg" data-testid="select-claim-type">
                          <SelectValue placeholder="Select the type of claim" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CLAIM_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="countyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">{i18n.newCase.countyLabel}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={countiesLoading}>
                      <FormControl>
                        <SelectTrigger className="h-14 text-lg" data-testid="select-county">
                          <SelectValue placeholder={countiesLoading ? "Loading counties..." : "Select a county"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-72 overflow-y-auto">
                        {counties?.map((county) => (
                          <SelectItem key={county.id} value={county.id}>
                            {county.name} County
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-2">
                      Usually where the defendant lives or where the incident happened.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full h-14 text-lg font-bold" 
                  disabled={createCase.isPending}
                  data-testid="button-create-case"
                >
                  {createCase.isPending ? "Creating..." : i18n.newCase.createBtn}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
