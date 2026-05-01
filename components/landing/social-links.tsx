import { createClient } from '@/lib/supabase/server'
import { SocialIcon, getPlatform } from '@/lib/social-platforms'

export async function SocialLinks() {
  try {
    const supabase = await createClient()
    const { data: links, error } = await supabase
      .from('social_links')
      .select('id, platform, label, url')
      .eq('active', true)
      .order('sort_order', { ascending: true })

    if (error || !links || links.length === 0) return null

    return (
      <div className="flex justify-center gap-3 mb-6">
        {links.map(link => {
          const platform = getPlatform(link.platform)
          return (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.label}
              title={link.label}
              className="group w-10 h-10 rounded-xl border border-white/10 flex items-center justify-center text-gray-500 hover:border-yellow-500/40 hover:text-white hover:bg-white/5 transition-all duration-200"
              style={{ '--brand': platform.color } as React.CSSProperties}
            >
              <span className="group-hover:scale-110 transition-transform duration-200 block">
                <SocialIcon platform={link.platform} size={18} />
              </span>
            </a>
          )
        })}
      </div>
    )
  } catch {
    return null
  }
}
