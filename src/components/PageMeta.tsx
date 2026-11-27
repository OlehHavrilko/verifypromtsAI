import { Helmet } from "react-helmet-async";

// Canonical site root. Override with VITE_SITE_URL when the app is served from a
// custom domain; otherwise derive it from the current deployment (GitHub Pages
// project sites live under /<repo>/).
const SITE_URL = (
  (import.meta.env.VITE_SITE_URL as string | undefined) ||
  `${window.location.origin}${import.meta.env.BASE_URL}`
).replace(/\/$/, "");

interface PageMetaProps {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
}

export function PageMeta({ title, description, path, noindex }: PageMetaProps) {
  const url = `${SITE_URL}${path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
    </Helmet>
  );
}
