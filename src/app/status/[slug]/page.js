"use client";

import { useCachedGet } from "@/lib/use-cached-get";
import { useParams } from "next/navigation";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UptimeBar } from "@/components/uptime-bar";
import { PageMotion } from "@/components/page-motion";

export default function PublicStatusPage() {
  const { slug } = useParams();
  const { data, error } = useCachedGet(slug ? `/api/status/${slug}` : null);

  const overallDown = (data?.state || []).some((s) => s.status === "down");

  return (
    <div className="min-h-dvh bg-black px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        {data?.brand?.hidePoweredBy ? (
          data.brand.name ? (
            <div className="text-sm font-semibold tracking-tight">{data.brand.name}</div>
          ) : null
        ) : (
          <Logo wordmark={data?.brand?.name || "Uplitycs"} />
        )}
        {error ? <p className="text-red-400">{error}</p> : null}
        {data ? (
          <PageMotion className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-3xl font-semibold">{data.site.name}</h1>
                <p className="text-zinc-400">{data.site.domain}</p>
              </div>
              <Badge variant={overallDown ? "danger" : "success"}>
                {overallDown ? "Degraded" : "All systems operational"}
              </Badge>
            </div>
            {(data.urls || []).map((url) => {
              const st = (data.state || []).find((s) => s.url === url);
              const up = st?.status !== "down";
              return (
                <Card key={url}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="truncate text-sm">{url}</CardTitle>
                    <Badge variant={up ? "success" : "danger"}>{up ? "Up" : "Down"}</Badge>
                  </CardHeader>
                  <CardContent>
                    <UptimeBar downtimes={data.downtimes} url={url} from={data.from} />
                  </CardContent>
                </Card>
              );
            })}
            {data.brand?.hidePoweredBy ? (
              <p className="text-xs text-zinc-600">Last 90 days</p>
            ) : (
              <p className="text-xs text-zinc-600">Powered by Uplitycs · last 90 days</p>
            )}
          </PageMotion>
        ) : null}
      </div>
    </div>
  );
}
