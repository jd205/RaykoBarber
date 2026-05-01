import { cookies } from 'next/headers'
import { dictionaries, type Locale, type Dict } from './dictionaries'

export async function getDict(): Promise<Dict> {
  const locale = (await cookies()).get('NEXT_LOCALE')?.value ?? 'en'
  return dictionaries[(locale as Locale) in dictionaries ? (locale as Locale) : 'en']
}
