import FirewallAuditDashboard from '@/components/firewall-audit-dashboard';
import AdminStatusPanel from '@/components/admin-status-panel';
import CachePerformancePanel from '@/components/cache-performance-panel';
import AnalysisTrackingPanel from '@/components/analysis-tracking-panel';
import ModelSelectorPanel from '@/components/model-selector-panel';
import RAGDocumentManager from '@/components/rag-document-manager';
import TelemetryPanel from '@/components/telemetry-panel';
import AuthGate from '@/components/auth-gate';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Home() {
  return (
    <AuthGate>
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <section className="mt-2">
          <Tabs defaultValue="workspace" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-xl border border-slate-200/70 bg-white/80 p-1 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/60">
              <TabsTrigger value="workspace">Intelligence workspace</TabsTrigger>
              <TabsTrigger value="admin">System control center</TabsTrigger>
            </TabsList>
            <TabsContent value="workspace" className="pt-4">
              <FirewallAuditDashboard />
            </TabsContent>
            <TabsContent value="admin" className="pt-4">
              <AdminStatusPanel />
              <div className="mt-6">
                <ModelSelectorPanel />
              </div>
              <div className="mt-6">
                <TelemetryPanel />
              </div>
              <div className="mt-6">
                <RAGDocumentManager />
              </div>
              <div className="mt-6">
                <AnalysisTrackingPanel />
              </div>
              <div className="mt-6">
                <CachePerformancePanel />
              </div>
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </AuthGate>
  );
}