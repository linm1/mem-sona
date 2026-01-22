import { DashboardLayout } from "./components/layout";

export default function Home() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Placeholder content */}
        <div className="card-brutal">
          <div className="card-header">
            <h2 className="font-mono-brutal text-sm">Welcome to mem-sona</h2>
          </div>
          <div className="card-body">
            <p className="text-body">
              Your personal memory infrastructure is ready. Use the sidebar to filter and search through your memories.
            </p>
          </div>
        </div>

        <div className="card-brutal">
          <div className="card-header">
            <h2 className="font-mono-brutal text-sm">Recent Memories</h2>
          </div>
          <div className="card-body">
            <p className="text-body text-muted">
              No memories yet. Start by adding your first memory using the "Add Memory" button.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
