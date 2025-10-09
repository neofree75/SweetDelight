import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  noindex?: boolean;
}

export default function SEO({ 
  title, 
  description, 
  keywords, 
  canonical, 
  ogImage = '/assets/logo_1757937077215-Fz5f71YX.png',
  ogType = 'website',
  noindex = false
}: SEOProps) {
  const fullTitle = title.includes('Marsela Bakery') ? title : `${title} | Marsela Bakery`;
  const siteUrl = 'https://bakery.erpnext.sk';
  const fullCanonical = canonical ? `${siteUrl}${canonical}` : siteUrl;
  const fullOgImage = ogImage.startsWith('http') ? ogImage : `${siteUrl}${ogImage}`;

  return (
    <Helmet>
      <html lang="sk" />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={fullCanonical} />
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullOgImage} />
      <meta property="og:url" content={fullCanonical} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content="Marsela Bakery" />
      <meta property="og:locale" content="sk_SK" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullOgImage} />
      
      {/* Additional SEO */}
      <meta name="robots" content={noindex ? "noindex,nofollow" : "index,follow"} />
      <meta name="author" content="Marsela Bakery" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Bakery",
          "name": "Marsela Bakery",
          "description": "Cukráreň s tradičnými receptúrami a moderným prístupom",
          "url": siteUrl,
          "logo": fullOgImage,
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "Dvorníky 364",
            "addressLocality": "Dvorníky",
            "addressCountry": "SK"
          },
          "telephone": "+421917795731",
          "email": "marcelabakery@gmail.com",
          "openingHours": [
            "Tu-Th 14:00-20:00",
            "Fr-Su 14:00-20:30"
          ],
          "servesCuisine": "Slovak",
          "priceRange": "€€"
        })}
      </script>
    </Helmet>
  );
}
