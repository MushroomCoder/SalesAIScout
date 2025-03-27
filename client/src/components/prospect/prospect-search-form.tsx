import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2 } from "lucide-react";
import { Channel } from "@shared/schema";

const searchSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  jobTitle: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  location: z.string().optional(),
  keywords: z.string().optional(),
  channels: z.array(z.string()).optional(),
});

type SearchFormValues = z.infer<typeof searchSchema>;

interface ProspectSearchFormProps {
  onSubmit: (values: SearchFormValues) => void;
  isLoading: boolean;
}

export function ProspectSearchForm({ onSubmit, isLoading }: ProspectSearchFormProps) {
  // Fetch available channels
  const { data: channels, isLoading: isLoadingChannels } = useQuery<Channel[]>({
    queryKey: ["/api/sdr/channels"],
  });

  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      query: "",
      jobTitle: "",
      industry: "",
      companySize: "any",
      location: "",
      keywords: "",
      channels: ["linkedin", "twitter", "google"],
    },
  });
  
  const handleSubmit = (values: SearchFormValues) => {
    onSubmit(values);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search for prospects</CardTitle>
        <CardDescription>
          Our AI will analyze and find the best matching prospects across platforms.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-6">
              <FormField
                control={form.control}
                name="query"
                render={({ field }) => (
                  <FormItem className="sm:col-span-6">
                    <FormLabel>Search Query</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. Marketing professionals in tech startup companies"
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>Main search query to find prospects</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem className="sm:col-span-3">
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. Marketing Manager, CTO, VP Sales"
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem className="sm:col-span-3">
                    <FormLabel>Industry</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. SaaS, Healthcare, Finance"
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="companySize"
                render={({ field }) => (
                  <FormItem className="sm:col-span-3">
                    <FormLabel>Company Size</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Any size" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="any">Any size</SelectItem>
                        <SelectItem value="1-10">1-10 employees</SelectItem>
                        <SelectItem value="11-50">11-50 employees</SelectItem>
                        <SelectItem value="51-200">51-200 employees</SelectItem>
                        <SelectItem value="201-500">201-500 employees</SelectItem>
                        <SelectItem value="501-1000">501-1000 employees</SelectItem>
                        <SelectItem value="1001+">1001+ employees</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem className="sm:col-span-3">
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. San Francisco, Remote, Europe"
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="keywords"
                render={({ field }) => (
                  <FormItem className="sm:col-span-6">
                    <FormLabel>Keywords</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. AI, machine learning, automation, digital transformation"
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>Separate keywords with commas</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Channels checkboxes */}
              <div className="sm:col-span-6">
                <FormItem>
                  <div className="mb-4">
                    <FormLabel>Search channels</FormLabel>
                  </div>
                  <div className="flex flex-wrap gap-6">
                    {isLoadingChannels ? (
                      <div className="flex items-center">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span className="text-sm">Loading channels...</span>
                      </div>
                    ) : (
                      channels?.map((channel) => (
                        <FormField
                          key={channel.id}
                          control={form.control}
                          name="channels"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={channel.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(channel.type)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      if (checked) {
                                        field.onChange([...current, channel.type]);
                                      } else {
                                        field.onChange(
                                          current.filter((value) => value !== channel.type)
                                        );
                                      }
                                    }}
                                    disabled={isLoading}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {channel.name}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))
                    )}
                  </div>
                </FormItem>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-neutral-50 flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search Prospects
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
