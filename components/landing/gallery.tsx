import Image from 'next/image'
import { getGalleryImages } from '@/app/actions/gallery'
import type { GalleryImage } from '@/app/actions/gallery'
import type { Dict } from '@/lib/i18n/dictionaries'

const FALLBACK: GalleryImage[] = [
  { id: '1', title: 'Precision Fade',       image_url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=800&auto=format&fit=crop', sort_order: 1, active: true, created_at: '' },
  { id: '2', title: 'Classic Pompadour',    image_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=800&auto=format&fit=crop', sort_order: 2, active: true, created_at: '' },
  { id: '3', title: 'Beard Trim & Shape',   image_url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=800&auto=format&fit=crop', sort_order: 3, active: true, created_at: '' },
  { id: '4', title: 'Hot Towel Treatment',  image_url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=800&auto=format&fit=crop', sort_order: 4, active: true, created_at: '' },
  { id: '5', title: 'Modern Textured Crop', image_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=800&auto=format&fit=crop', sort_order: 5, active: true, created_at: '' },
  { id: '6', title: 'Straight Razor Shave', image_url: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?q=80&w=800&auto=format&fit=crop', sort_order: 6, active: true, created_at: '' },
]

export async function Gallery({ dict }: { dict: Dict }) {
  const dbImages = await getGalleryImages()
  const photos = dbImages.length > 0 ? dbImages : FALLBACK

  return (
    <section id="gallery" className="py-24 bg-[#0a0a0a] text-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-yellow-500 uppercase tracking-widest text-sm mb-3">{dict.galleryLabel}</p>
          <h2 className="text-3xl md:text-5xl font-bold">{dict.galleryTitle}</h2>
        </div>

        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {photos.map(photo => (
            <div key={photo.id} className="relative overflow-hidden rounded-xl group break-inside-avoid">
              <div className="aspect-[3/4] relative">
                <Image
                  src={photo.image_url}
                  alt={photo.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                <div className="p-6">
                  <h3 className="text-lg font-bold text-white mb-1">{photo.title}</h3>
                  <p className="text-sm text-gray-300">{dict.galleryBrand}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
