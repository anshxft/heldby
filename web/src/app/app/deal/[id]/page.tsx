import { Suspense } from "react";
import { DealView } from "./deal-view";

export default function DealPage({ params }: PageProps<"/app/deal/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">Loading escrow…</p>}>
      {params.then(({ id }) => (/^\d+$/.test(id) ? <DealView id={id} /> : <p className="text-lg">Escrow not found.</p>))}
    </Suspense>
  );
}
