export async function generateMetadata({ params }) {
  // In Next.js 15+, params is a Promise
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  
  try {
    const res = await fetch(`${API_URL}/api/anime/${slug}`, {
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (res.ok) {
      const data = await res.json();
      
      if (data?.success && data?.data) {
        const anime = data.data;
        
        const title = `${anime.title}`; // Will be appended with | Kolektaku by root layout
        const description = anime.synopsis 
            ? (anime.synopsis.length > 150 ? anime.synopsis.substring(0, 147) + "..." : anime.synopsis)
            : `Nonton anime ${anime.title} subtitle Indonesia kualitas HD di Kolektaku.`;
            
        const imageUrl = anime.landscapePosterUrl || anime.posterUrl || "/logo.png";
        
        return {
          title: title,
          description: description,
          openGraph: {
            title: title,
            description: description,
            images: [
              {
                url: imageUrl,
                width: 1200,
                height: 630,
                alt: anime.title,
              }
            ],
            type: "video.tv_show",
          },
          twitter: {
            card: "summary_large_image",
            title: title,
            description: description,
            images: [imageUrl],
          }
        };
      }
    }
  } catch (error) {
    console.error("Failed to generate metadata for anime:", slug, error);
  }
  
  // Fallback
  return {
    title: "Anime Detail",
  };
}

export default function AnimeDetailLayout({ children }) {
  return children;
}
