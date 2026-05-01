export function AvatarUpload({ 
  userId, 
  currentAvatarUrl,
  fullName
}: { 
  userId: string, 
  currentAvatarUrl?: string | null,
  fullName?: string
}) {
  // Generate a distinct auto-avatar mapping to the user
  const defaultAvatar = fullName 
    ? `https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(fullName)}&backgroundColor=000000`
    : `https://api.dicebear.com/9.x/micah/svg?seed=${userId}&backgroundColor=000000`

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black border-2 border-yellow-500 overflow-hidden flex-shrink-0 shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={currentAvatarUrl || defaultAvatar}
          alt="Profile Avatar" 
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  )
}
