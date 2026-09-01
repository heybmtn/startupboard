import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createCheckout, fetchTerritory, uploadLogo } from "../lib/api";
import type { Territory } from "../types";
import { formatPrice } from "../types";

const DESCRIPTION_MAX = 160;

export default function Claim() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();

  const [territory, setTerritory] = useState<Territory | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [ownerName, setOwnerName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetchTerritory(slug)
      .then(setTerritory)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Territory not found"));
  }, [slug]);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoPreview(URL.createObjectURL(file));
    setUploading(true);
    setSubmitError(null);
    try {
      const { logoUrl } = await uploadLogo(file);
      setLogoUrl(logoUrl);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Logo upload failed");
      setLogoPreview(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!territory) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { checkoutUrl } = await createCheckout({
        slug: territory.slug,
        ownerName,
        companyName,
        description,
        websiteUrl,
        logoUrl,
      });
      window.location.href = checkoutUrl;
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 text-center">
        <p className="text-lg font-semibold text-red-300">{loadError}</p>
        <Link to="/" className="mt-4 text-indigo-400 underline">
          Back to the board
        </Link>
      </div>
    );
  }

  if (!territory) {
    return <div className="py-24 text-center text-slate-500">Loading…</div>;
  }

  const isTakeover = territory.status === "sold";

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-12">
      <Link to="/" className="text-sm text-slate-400 hover:text-slate-200">
        ← Back to the board
      </Link>

      <h1 className="mt-4 font-display text-3xl font-bold text-white">
        {isTakeover ? "Take over" : "Claim"} {territory.name} Territory
      </h1>
      {isTakeover && (
        <p className="mt-1 text-sm text-slate-400">
          Currently owned by {territory.companyName || territory.ownerName}. Pay more to take their spot.
        </p>
      )}
      <p className="mt-1 text-lg font-semibold text-indigo-300">
        Price: {formatPrice(territory.nextPricePence)}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">Name *</label>
          <input
            required
            maxLength={100}
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
            placeholder="Jane Doe"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">Company / Startup</label>
          <input
            maxLength={100}
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
            placeholder="Acme AI"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">Short description *</label>
          <textarea
            required
            maxLength={DESCRIPTION_MAX}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
            placeholder="Building the future of AI productivity."
          />
          <p className="mt-1 text-right text-xs text-slate-500">
            {description.length}/{DESCRIPTION_MAX}
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">Website</label>
          <input
            type="url"
            maxLength={2048}
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
            placeholder="https://acme.ai"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">Logo</label>
          <div className="flex items-center gap-3">
            {logoPreview && (
              <img src={logoPreview} alt="Logo preview" className="h-12 w-12 rounded-full border border-white/20 object-cover" />
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleLogoChange}
              className="flex-1 text-sm text-slate-400 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-white/20"
            />
          </div>
          {uploading && <p className="mt-1 text-xs text-slate-500">Uploading…</p>}
        </div>

        {submitError && <p className="text-sm text-red-300">{submitError}</p>}

        <button
          type="submit"
          disabled={submitting || uploading}
          className="w-full rounded-full bg-indigo-500 px-6 py-3 font-display font-semibold text-white shadow-lg shadow-indigo-500/30 transition-transform hover:-translate-y-0.5 hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Redirecting to payment…" : "Continue to Payment"}
        </button>
      </form>
    </div>
  );
}
