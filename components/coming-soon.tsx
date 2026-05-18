import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({
  title,
  description,
  step,
}: {
  title: string;
  description: string;
  step: string;
}) {
  return (
    <div className="px-4 pb-8 pt-8">
      <header className="mb-4">
        <h1 className="text-3xl font-extrabold">{title}</h1>
      </header>
      <Card>
        <CardContent className="space-y-3 p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-8 w-8" aria-hidden />
          </div>
          <Badge variant="secondary">곧 추가될 기능 · {step}</Badge>
          <p className="text-base text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
