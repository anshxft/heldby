import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "../../ui";
import { DealView } from "./deal-view";

// deals are personal records: shareable by link, but kept out of search results
export async function generateMetadata({ params }: PageProps<"/app/deal/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Escrow #${id}`, description: "A USDC escrow on Arc, settled by its client or Heldby's AI agent.", robots: { index: false }, alternates: { canonical: `/app/deal/${id}` } };
}

export default function DealPage({ params }: PageProps<"/app/deal/[id]">) {
  return (
    <Suspense fallback={<Skeleton kind="deal" />}>
      {params.then(({ id }) => (/^\d+$/.test(id) ? <DealView id={id} /> : <p className="text-lg">Escrow not found.</p>))}
    </Suspense>
  );
}
