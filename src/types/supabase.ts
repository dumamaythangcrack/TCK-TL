// src/types/supabase.ts

/**
 * Minimal supabase type definitions for the storage helper.
 * Replace with the generated types from `supabase gen types typescript` if available.
 */
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      // Example tables can be added here if needed.
    };
    Functions: {};
    Enums: {};
  };
}
