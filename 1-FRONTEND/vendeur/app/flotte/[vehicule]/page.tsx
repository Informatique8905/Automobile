export default async function Page({ params }: { params: Promise<{ vehicule: string }> }) { const { vehicule } = await params; return <main>Véhicule {vehicule}</main>; }
