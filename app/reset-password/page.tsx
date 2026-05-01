import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ResetPasswordPage() {
  const updatePassword = async (formData: FormData) => {
    'use server'

    const password = formData.get('password') as string

    if (!password || password.length < 8) {
      return redirect('/reset-password?error=Password+must+be+at+least+8+characters')
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      return redirect(`/reset-password?error=${encodeURIComponent(error.message)}`)
    }

    return redirect('/dashboard')
  }

  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2">
      <form className="animate-in flex-1 flex flex-col w-full justify-center gap-2 text-foreground" action={updatePassword}>
        <h1 className="text-2xl font-bold mb-4 text-center">Enter New Password</h1>
        <p className="text-sm text-gray-500 mb-4 text-center">
          Please enter your new password below (minimum 8 characters).
        </p>
        <label className="text-md" htmlFor="password">
          New Password
        </label>
        <input
          className="rounded-md px-4 py-2 bg-inherit border mb-6"
          type="password"
          name="password"
          placeholder="••••••••"
          minLength={8}
          required
        />
        <button className="bg-foreground text-background rounded-md px-4 py-2 text-white bg-black hover:bg-gray-800 transition-colors mb-2">
          Update Password
        </button>
      </form>
    </div>
  )
}
