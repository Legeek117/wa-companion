/**
 * Supabase client — DÉSACTIVÉ
 * La base de données utilise PostgreSQL local via Prisma.
 * Le stockage des médias utilise le système de fichiers local (volume Docker).
 *
 * Ce fichier est conservé pour éviter les erreurs d'import dans les fichiers
 * qui n'ont pas encore été nettoyés. Les fonctions retournent des no-ops.
 */

export const getSupabaseClient = (): any => {
  return {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }), data: null, error: null }) }),
      insert: async () => ({ data: null, error: null }),
      update: () => ({ eq: () => ({ data: null, error: null }) }),
      delete: () => ({ eq: () => ({ data: null, error: null }) }),
      upsert: async () => ({ data: null, error: null }),
    }),
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: null }),
        download: async () => ({ data: null, error: null }),
        remove: async () => ({ data: null, error: null }),
        list: async () => ({ data: [], error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
  };
};
