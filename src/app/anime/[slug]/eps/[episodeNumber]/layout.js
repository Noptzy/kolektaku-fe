export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { slug, episodeNumber } = resolvedParams;

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  
  try {
    const res = await fetch(`${API_URL}/api/anime/${slug}/eps/${episodeNumber}`, {
      next: { revalidate: 3600 }
    });
    
    if (res.ok) {
      const data = await res.json();
      
      if (data?.success && data?.data) {
        const epData = data.data;
        const animeTitle = epData.animeDetail?.koleksi?.title || "Anime";
        
        const title = `Nonton ${animeTitle} Episode ${episodeNumber} Sub Indo | Kolektaku`;
        const description = `Streaming dan nonton ${animeTitle} Episode ${episodeNumber} dengan subtitle Indonesia kualitas HD di Kolektaku.`;
        
        // Use anime landscape poster if episode doesn't have a thumbnail
        const imageUrl = epData.animeDetail?.koleksi?.landscapePosterUrl 
          || epData.animeDetail?.koleksi?.posterUrl 
          || "/logo.png";
        
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
                alt: `Episode ${episodeNumber}`,
              }
            ],
            type: "video.episode",
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
    console.error("Failed to generate metadata for episode:", slug, episodeNumber, error);
  }
  
  // Fallback
  return {
    title: `Episode ${episodeNumber}`,
  };
}

export default function EpisodeWatchLayout({ children }) {
  return children;
}
