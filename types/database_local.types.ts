export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            courts: {
                Row: {
                    id: string
                    club_id: string
                    name: string
                    is_active: boolean
                    created_at: string
                    // Manual addition for type safety, actual col needs SQL migration
                    price_hour?: number | null
                }
                Insert: {
                    id?: string
                    club_id: string
                    name: string
                    is_active?: boolean
                    created_at?: string
                    price_hour?: number | null
                }
                Update: {
                    id?: string
                    club_id?: string
                    name?: string
                    is_active?: boolean
                    created_at?: string
                    price_hour?: number | null
                    pricing_rules?: any[] | null // jsonb
                }
            }
            clubs: {
                Row: {
                    id: string
                    opening_hours?: any | null // jsonb
                    // ... other fields
                }
                Update: {
                    opening_hours?: any | null
                }
            }
            // ... other tables
        }
    }
}
