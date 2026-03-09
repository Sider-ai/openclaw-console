import { Construction } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type PlaceholderPageProps = {
  description: string;
  title: string;
};

export function PlaceholderPage({ description, title }: PlaceholderPageProps) {
  return (
    <Card className="shadow-sm ring-1 ring-border/60">
      <CardContent className="p-6">
        <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Construction className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
