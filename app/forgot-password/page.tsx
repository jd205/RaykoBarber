import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ForgotPasswordPage() {
  const resetPassword = async (formData: FormData) => {
    'use server'

    const email = formData.get('email') as string
    const supabase = await createClient()

    const { headers } = await import('next/headers')
    const origin = (await headers()).get('origin') || process.env.NEXT_PUBLIC_SITE_URL || ''

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    })

    if (error) {
      return redirect('/forgot-password?error=Could not reset password')
    }

    return redirect('/forgot-password?message=Password reset email sent')
  }

  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2">
      <form className="animate-in flex-1 flex flex-col w-full justify-center gap-2 text-foreground" action={resetPassword}>
        <h1 className="text-2xl font-bold mb-4 text-center">Reset Password</h1>
        <p className="text-sm text-gray-500 mb-4 text-center">
          Enter your email and we'll send you a link to reset your password.
        </p>
        <label className="text-md" htmlFor="email">
          Email
        </label>
        <input
          className="rounded-md px-4 py-2 bg-inherit border mb-6"
          name="email"
          placeholder="you@example.com"
          required
        />
        <button className="bg-foreground text-background rounded-md px-4 py-2 text-white bg-black hover:bg-gray-800 transition-colors mb-2">
          Send Reset Link
        </button>
        <div className="text-sm text-center mt-4">
          Remember your password? <Link href="/login" className="underline">Sign in</Link>
        </div>
      </form>
    </div>
  )
}
