import { useCallback, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { SCENARIOS, getScenario } from '../scenarios';
import { useTheme } from '../hooks/useTheme';
import { useHashRoute } from '../hooks/useHashRoute';
import { AppShell } from '../components/layout/AppShell';
import { Header } from '../components/layout/Header';
import { ScenarioSidebar } from '../components/catalog/ScenarioSidebar';
import { TopologyViewer } from '../components/app/TopologyViewer';
import { SubnetViewer } from '../components/app/SubnetViewer';
import { GlossaryView } from '../components/education/GlossaryView';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [route, navigate] = useHashRoute();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const found = route.scenarioId ? getScenario(route.scenarioId) : undefined;
  const scenario = found ?? SCENARIOS[0]!;
  const unknown = route.scenarioId !== null && !found;
  const isSimulator = route.view === 'simulador';

  const selectScenario = useCallback(
    (id: string) => {
      navigate({ view: 'simulador', scenarioId: id });
      setDrawerOpen(false);
    },
    [navigate],
  );
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <AppShell
      header={
        <Header
          view={route.view}
          scenarioTitle={isSimulator ? scenario.title : undefined}
          onNavigate={(view) => navigate({ view, scenarioId: view === 'simulador' ? scenario.id : null })}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenCatalog={isSimulator ? () => setDrawerOpen(true) : undefined}
        />
      }
      sidebar={isSimulator ? <ScenarioSidebar scenarios={SCENARIOS} selectedId={scenario.id} onSelect={selectScenario} /> : undefined}
      sidebarOpen={drawerOpen}
      onCloseSidebar={closeDrawer}
    >
      {isSimulator ? (
        <>
          {unknown && (
            <p role="alert" className="border-b border-line bg-warn/10 px-4 py-2 text-xs text-fg">
              No existe el escenario “{route.scenarioId}”. Se muestra “{scenario.title}”.
            </p>
          )}
          {/* key: cambiar de escenario desmonta el visor y su motor cancela cualquier temporizador. */}
          {scenario.kind === 'topology' ? (
            <ReactFlowProvider key={scenario.id}>
              <TopologyViewer scenario={scenario} theme={theme} />
            </ReactFlowProvider>
          ) : (
            <SubnetViewer key={scenario.id} scenario={scenario} />
          )}
        </>
      ) : (
        <GlossaryView onOpenScenario={selectScenario} />
      )}
    </AppShell>
  );
}
