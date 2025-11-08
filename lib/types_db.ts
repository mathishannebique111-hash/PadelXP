export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      players: {
        Row: {
          id: string;
          user_id: string | null;
          name: string | null;
          email: string | null;
          points: number | null;
          rank: string | null;
          matches_played: number | null;
          wins: number | null;
          losses: number | null;
          win_streak: number | null;
          badges: string[] | null;
          is_ghost: boolean | null;
          created_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["players"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["players"]["Row"]>;
      };
      reviews: {
        Row: {
          id: string;
          user_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          rating?: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
