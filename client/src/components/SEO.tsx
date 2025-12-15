import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  noindex?: boolean;
  structuredData?: Record<string, any>; // Pre vlastné structured data
  breadcrumbs?: Array<{ name: string; url: string }>; // Pre breadcrumb navigation
  product?: {
    name: string;
    description: string;
    image: string;
    price: number;
    priceCurrency?: string;
    availability?: string;
    category?: string;
  }; // Pre produktové stránky
}

export default function SEO({ 
  title, 
  description, 
  keywords, 
  canonical, 
  ogImage = '/assets/logo_1757937077215-Fz5f71YX.png',
  ogType = 'website',
  noindex = false,
  structuredData,
  breadcrumbs,
  product
}: SEOProps) {
  const fullTitle = title.includes('Marsela Bakery') ? title : `${title} | Marsela Bakery`;
  const siteUrl = 'https://bakery.erpnext.sk';
  const fullCanonical = canonical ? `${siteUrl}${canonical}` : siteUrl;
  const fullOgImage = ogImage.startsWith('http') ? ogImage : `${siteUrl}${ogImage}`;

  // Základné structured data pre bakery
  const bakeryStructuredData = {
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
    "email": "marselabakery@gmail.com",
    "openingHours": [
      "Tu-Th 14:00-20:00",
      "Fr-Su 14:00-20:30"
    ],
    "servesCuisine": "Slovak",
    "priceRange": "€€",
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "48.3581",
      "longitude": "17.7378"
    }
  };

  // Product structured data
  const productStructuredData = product ? {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description,
    "image": product.image.startsWith('http') ? product.image : `${siteUrl}${product.image}`,
    "offers": {
      "@type": "Offer",
      "price": product.price,
      "priceCurrency": product.priceCurrency || "EUR",
      "availability": product.availability || "https://schema.org/InStock",
      "url": fullCanonical
    },
    "category": product.category,
    "brand": {
      "@type": "Brand",
      "name": "Marsela Bakery"
    }
  } : null;

  // Breadcrumb structured data
  const breadcrumbStructuredData = breadcrumbs && breadcrumbs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": crumb.name,
      "item": crumb.url.startsWith('http') ? crumb.url : `${siteUrl}${crumb.url}`
    }))
  } : null;

  // Zlúčenie všetkých structured data
  const allStructuredData = [
    bakeryStructuredData,
    productStructuredData,
    breadcrumbStructuredData,
    structuredData
  ].filter(Boolean);

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
      {product && (
        <>
          <meta property="og:price:amount" content={product.price.toString()} />
          <meta property="og:price:currency" content={product.priceCurrency || "EUR"} />
        </>
      )}
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullOgImage} />
      
      {/* Additional SEO */}
      <meta name="robots" content={noindex ? "noindex,nofollow" : "index,follow"} />
      <meta name="author" content="Marsela Bakery" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
      <meta name="geo.region" content="SK" />
      <meta name="geo.placename" content="Dvorníky" />
      <meta name="geo.position" content="48.3581;17.7378" />
      <meta name="ICBM" content="48.3581, 17.7378" />
      
      {/* Structured Data */}
      {allStructuredData.map((data, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  );
}
