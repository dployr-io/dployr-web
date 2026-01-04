// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import AppLayout from "@/layouts/app-layout";
import type { BreadcrumbItem, InstanceStream, Service } from "@/types";
import { ProtectedRoute } from "@/components/protected-route";
import { useQueryClient } from "@tanstack/react-query";
import { ProxyGraphVisualizer } from "@/components/proxy-graph/index";
import { ProxyAddDialog } from "@/components/proxy-add-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RotateCcw } from "lucide-react";
import { useInstances } from "@/hooks/use-instances";
import { useInstanceStream } from "@/hooks/use-instance-stream";
import { useProxyOperations } from "@/hooks/use-proxy-operations";
import { useUrlState } from "@/hooks/use-url-state";
import { toast } from "@/lib/toast";

export const Route = createFileRoute("/clusters/$clusterId/graph")({
  component: GraphPage,
});

const graphBreadcrumbs = (clusterId?: string): BreadcrumbItem[] => [
  { title: "Dashboard", href: `/clusters/${clusterId}/dashboard` },
  { title: "Graph", href: `/clusters/${clusterId}/graph` },
];


function GraphPage() {
  const { clusterId } = Route.useParams();
  const { useAppError } = useUrlState();
  const [, setAppError] = useAppError();

  // State
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isAddingService, setIsAddingService] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);

  // Hooks
  const { instances } = useInstances();
  useInstanceStream(); // Ensure stream is active

  // Auto-select first instance
  useEffect(() => {
    if (!selectedInstance && instances?.length) {
      setSelectedInstance(instances[0].id);
    }
  }, [instances, selectedInstance]);

  // Get current instance
  const currentInstance = useMemo(() => {
    if (!selectedInstance || !instances) return null;
    return instances.find((i) => i.id === selectedInstance) ?? null;
  }, [selectedInstance, instances]);

  // Get proxy operations for the selected instance
  const {
    apps,
    status: proxyStatus,
    isLoading: proxyLoading,
    error: proxyError,
    restart,
    addService,
    removeService,
  } = useProxyOperations(currentInstance?.tag);

  // Get services from instance stream to show all services on graph
  const queryClient = useQueryClient();
  const services = useMemo(() => {
    if (!currentInstance?.tag) return [];
    
    const data = queryClient.getQueryData<InstanceStream>(["instance-status", currentInstance.tag]);
    const update = data?.update as any;
    return (update?.services || []) as Service[];
  }, [currentInstance?.tag, queryClient]);

  const _services = useMemo(() => {
    return services.map((service) => ({
      id: service.id,
      name: service.name,
      port: service.port,
    }));
  }, [services]);

  // Handle error display
  useEffect(() => {
    if (proxyError) {
      setAppError({
        appError: {
          message: proxyError,
          helpLink: "https://docs.dployr.io/proxy/troubleshooting",
        },
      });
    }
  }, [proxyError, setAppError]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    // Proxy data refreshes automatically from instance stream
    toast.success("Proxy status refreshed");
  }, []);

  const handleRestart = useCallback(async () => {
    if (!currentInstance) return;

    setIsRestarting(true);
    try {
      await restart(currentInstance.tag, clusterId);
      toast.success("Proxy restart initiated");
      setRestartDialogOpen(false);
    } catch {
      toast.error("Failed to restart proxy");
    } finally {
      setIsRestarting(false);
    }
  }, [currentInstance, clusterId, restart]);

  const handleAddService = useCallback(
    async (data: {
      serviceName: string;
      upstream: string;
      domain?: string;
      root?: string;
      template?: string;
    }) => {
      if (!currentInstance) return;

      setIsAddingService(true);
      try {
        await addService(currentInstance.tag, clusterId, data.serviceName, data.upstream, {
          domain: data.domain,
          root: data.root,
          template: data.template,
        });
        toast.success(`Service "${data.serviceName}" added successfully`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to add service";
        toast.error(message);
        throw error;
      } finally {
        setIsAddingService(false);
      }
    },
    [currentInstance, clusterId, addService]
  );

  const handleRemoveService = useCallback(
    async (serviceName: string) => {
      if (!currentInstance) return;

      try {
        await removeService(currentInstance.tag, clusterId, serviceName);
        toast.success(`Service "${serviceName}" removed`);
      } catch {
        toast.error("Failed to remove service");
      }
    },
    [currentInstance, clusterId, removeService]
  );

  return (
    <ProtectedRoute>
      <AppLayout breadcrumbs={graphBreadcrumbs(clusterId)}>
        <div className="flex flex-col h-full p-6">
          <ProxyGraphVisualizer
            proxyStatus={proxyStatus}
            apps={apps}
            services={services}
            instances={instances?.map(i => ({ id: i.id, name: i.tag, status: "running" })) ?? []}
            isLoading={proxyLoading}
            onRefresh={handleRefresh}
            onSelectApp={(domain: string, app: any) => {
              console.log("Selected:", domain, app);
            }}
            onAddRoute={() => setAddDialogOpen(true)}
            onRemoveRoute={async (domain: string) => {
              await handleRemoveService(domain);
            }}
            onRestart={() => setRestartDialogOpen(true)}
            className="flex-1"
          />
        </div>

        {/* Add Service Dialog */}
        <ProxyAddDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onSubmit={handleAddService}
          isSubmitting={isAddingService}
          services={_services}
        />

        {/* Restart Confirmation Dialog */}
        <AlertDialog open={restartDialogOpen} onOpenChange={setRestartDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Restart proxy server?</AlertDialogTitle>
              <AlertDialogDescription>
                This will briefly interrupt all proxy routes on{" "}
                <strong>{currentInstance?.tag}</strong>. Active connections may be dropped.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isRestarting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRestart} disabled={isRestarting}>
                {isRestarting && <RotateCcw className="h-4 w-4 mr-2 animate-spin" />}
                {isRestarting ? "Restarting..." : "Restart"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </AppLayout>
    </ProtectedRoute>
  );
}