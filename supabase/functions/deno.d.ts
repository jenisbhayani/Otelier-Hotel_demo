/** Deno globals for Supabase Edge Functions (IDE type-checking; runtime is Deno). */
declare namespace Deno {
  namespace env {
    function get(key: string): string | undefined
  }

  function serve(
    handler: (request: Request) => Response | Promise<Response>,
  ): void
}
