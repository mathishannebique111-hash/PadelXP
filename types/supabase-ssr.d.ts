declare module "@supabase/ssr" {
  export function createBrowserClient<T = any>(url: string, anonKey: string): any;
  export function createServerClient<T = any>(url: string, anonKey: string, opts?: any): any;
}


