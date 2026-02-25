export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_club_actions: {
        Row: {
          action_description: string
          action_type: string
          admin_user_id: string
          club_id: string
          created_at: string | null
          id: string
          new_value: Json | null
          previous_value: Json | null
        }
        Insert: {
          action_description: string
          action_type: string
          admin_user_id: string
          club_id: string
          created_at?: string | null
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
        }
        Update: {
          action_description?: string
          action_type?: string
          admin_user_id?: string
          club_id?: string
          created_at?: string | null
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_club_actions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_messages: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          sender_id: string
          sender_name: string
          sender_type: string
          subject: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          sender_id: string
          sender_name: string
          sender_type: string
          subject?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          sender_id?: string
          sender_name?: string
          sender_type?: string
          subject?: string | null
        }
        Relationships: []
      }
      badges: {
        Row: {
          code: string
          description: string | null
          icon: string | null
          name: string
        }
        Insert: {
          code: string
          description?: string | null
          icon?: string | null
          name: string
        }
        Update: {
          code?: string
          description?: string | null
          icon?: string | null
          name?: string
        }
        Relationships: []
      }
      challenge_badges: {
        Row: {
          badge_emoji: string
          badge_name: string
          challenge_id: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_emoji: string
          badge_name: string
          challenge_id: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_emoji?: string
          badge_name?: string
          challenge_id?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      challenge_rewards: {
        Row: {
          awarded_at: string | null
          challenge_id: string
          id: string
          reward_type: string
          reward_value: string
          user_id: string
        }
        Insert: {
          awarded_at?: string | null
          challenge_id: string
          id?: string
          reward_type: string
          reward_value: string
          user_id: string
        }
        Update: {
          awarded_at?: string | null
          challenge_id?: string
          id?: string
          reward_type?: string
          reward_value?: string
          user_id?: string
        }
        Relationships: []
      }
      club_admins: {
        Row: {
          activated_at: string | null
          club_id: string
          email: string
          id: string
          invited_at: string | null
          invited_by: string | null
          role: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          club_id: string
          email: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          role?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          club_id?: string
          email?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      club_conversations: {
        Row: {
          club_id: string
          created_at: string | null
          id: string
          is_read_by_admin: boolean | null
          is_read_by_club: boolean | null
          last_message_at: string | null
          last_message_preview: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          club_id: string
          created_at?: string | null
          id?: string
          is_read_by_admin?: boolean | null
          is_read_by_club?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          club_id?: string
          created_at?: string | null
          id?: string
          is_read_by_admin?: boolean | null
          is_read_by_club?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_conversations_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: true
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_hidden_visitors: {
        Row: {
          club_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_hidden_visitors_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_hidden_visitors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_hidden_visitors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "suggested_pairs"
            referencedColumns: ["player1_id"]
          },
          {
            foreignKeyName: "club_hidden_visitors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "suggested_pairs"
            referencedColumns: ["player2_id"]
          },
          {
            foreignKeyName: "club_hidden_visitors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "suggested_partners"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "club_hidden_visitors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "suggested_partners"
            referencedColumns: ["player_id"]
          },
        ]
      }
      club_member_imports: {
        Row: {
          club_id: string
          created_at: string | null
          created_by: string | null
          email: string
          email_normalized: string
          first_name: string | null
          id: string
          last_name: string | null
          notes: string | null
          phone: string | null
          raw_data: Json | null
          status: string
        }
        Insert: {
          club_id: string
          created_at?: string | null
          created_by?: string | null
          email: string
          email_normalized: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          raw_data?: Json | null
          status?: string
        }
        Update: {
          club_id?: string
          created_at?: string | null
          created_by?: string | null
          email?: string
          email_normalized?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          raw_data?: Json | null
          status?: string
        }
        Relationships: []
      }
      club_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          is_admin: boolean | null
          sender_id: string
          type: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          sender_id: string
          type?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          sender_id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "admin_club_conversations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "club_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      club_stop_survey_responses: {
        Row: {
          club_id: string
          created_at: string | null
          id: string
          response: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string | null
          id?: string
          response: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string | null
          id?: string
          response?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_stop_survey_responses_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          address: string | null
          auto_extension_reason: string | null
          auto_extension_unlocked: boolean | null
          auto_extension_unlocked_date: string | null
          city: string | null
          code_invitation: string
          court_type: string | null
          created_at: string | null
          dashboard_login_count: number | null
          id: string
          invitations_sent_count: number | null
          is_suspended: boolean | null
          last_engagement_check_date: string | null
          logo_url: string | null
          manual_extension_by_user_id: string | null
          manual_extension_date: string | null
          manual_extension_days: number | null
          manual_extension_granted: boolean | null
          manual_extension_notes: string | null
          name: string
          number_of_courts: number | null
          offer_type: string | null
          opening_hours: Json | null
          phone: string | null
          plan_selected_at: string | null
          postal_code: string | null
          proposed_extension_accepted: boolean | null
          proposed_extension_sent: boolean | null
          proposed_extension_sent_date: string | null
          scheduled_deletion_at: string | null
          selected_plan: string | null
          slug: string
          status: string | null
          stripe_account_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_started_at: string | null
          subscription_status: string | null
          suspended_at: string | null
          total_challenges_count: number | null
          total_matches_count: number | null
          total_players_count: number | null
          trial_base_end_date: string | null
          trial_current_end_date: string | null
          trial_end_date: string | null
          trial_start: string | null
          trial_start_date: string | null
          trial_status: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          auto_extension_reason?: string | null
          auto_extension_unlocked?: boolean | null
          auto_extension_unlocked_date?: string | null
          city?: string | null
          code_invitation: string
          court_type?: string | null
          created_at?: string | null
          dashboard_login_count?: number | null
          id?: string
          invitations_sent_count?: number | null
          is_suspended?: boolean | null
          last_engagement_check_date?: string | null
          logo_url?: string | null
          manual_extension_by_user_id?: string | null
          manual_extension_date?: string | null
          manual_extension_days?: number | null
          manual_extension_granted?: boolean | null
          manual_extension_notes?: string | null
          name: string
          number_of_courts?: number | null
          offer_type?: string | null
          opening_hours?: Json | null
          phone?: string | null
          plan_selected_at?: string | null
          postal_code?: string | null
          proposed_extension_accepted?: boolean | null
          proposed_extension_sent?: boolean | null
          proposed_extension_sent_date?: string | null
          scheduled_deletion_at?: string | null
          selected_plan?: string | null
          slug: string
          status?: string | null
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          suspended_at?: string | null
          total_challenges_count?: number | null
          total_matches_count?: number | null
          total_players_count?: number | null
          trial_base_end_date?: string | null
          trial_current_end_date?: string | null
          trial_end_date?: string | null
          trial_start?: string | null
          trial_start_date?: string | null
          trial_status?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          auto_extension_reason?: string | null
          auto_extension_unlocked?: boolean | null
          auto_extension_unlocked_date?: string | null
          city?: string | null
          code_invitation?: string
          court_type?: string | null
          created_at?: string | null
          dashboard_login_count?: number | null
          id?: string
          invitations_sent_count?: number | null
          is_suspended?: boolean | null
          last_engagement_check_date?: string | null
          logo_url?: string | null
          manual_extension_by_user_id?: string | null
          manual_extension_date?: string | null
          manual_extension_days?: number | null
          manual_extension_granted?: boolean | null
          manual_extension_notes?: string | null
          name?: string
          number_of_courts?: number | null
          offer_type?: string | null
          opening_hours?: Json | null
          phone?: string | null
          plan_selected_at?: string | null
          postal_code?: string | null
          proposed_extension_accepted?: boolean | null
          proposed_extension_sent?: boolean | null
          proposed_extension_sent_date?: string | null
          scheduled_deletion_at?: string | null
          selected_plan?: string | null
          slug?: string
          status?: string | null
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          suspended_at?: string | null
          total_challenges_count?: number | null
          total_matches_count?: number | null
          total_players_count?: number | null
          trial_base_end_date?: string | null
          trial_current_end_date?: string | null
          trial_end_date?: string | null
          trial_start?: string | null
          trial_start_date?: string | null
          trial_status?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          club_id: string
          created_at: string | null
          id: string
          is_read_by_admin: boolean | null
          is_read_by_user: boolean | null
          last_message_at: string | null
          last_message_preview: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string | null
          id?: string
          is_read_by_admin?: boolean | null
          is_read_by_user?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string | null
          id?: string
          is_read_by_admin?: boolean | null
          is_read_by_user?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      courts: {
        Row: {
          club_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          opening_hours: Json | null
          price_hour: number | null
          pricing_rules: Json | null
          updated_at: string | null
        }
        Insert: {
          club_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          opening_hours?: Json | null
          price_hour?: number | null
          pricing_rules?: Json | null
          updated_at?: string | null
        }
        Update: {
          club_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          opening_hours?: Json | null
          price_hour?: number | null
          pricing_rules?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      disciplinary_points: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          incident_date: string
          is_active: boolean | null
          player_id: string
          points: number
          reason: string
          tournament_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          incident_date: string
          is_active?: boolean | null
          player_id: string
          points: number
          reason: string
          tournament_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          incident_date?: string
          is_active?: boolean | null
          player_id?: string
          points?: number
          reason?: string
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disciplinary_points_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disciplinary_points_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "suggested_pairs"
            referencedColumns: ["player1_id"]
          },
          {
            foreignKeyName: "disciplinary_points_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "suggested_pairs"
            referencedColumns: ["player2_id"]
          },
          {
            foreignKeyName: "disciplinary_points_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "suggested_partners"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "disciplinary_points_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "suggested_partners"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "disciplinary_points_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      earned_badges: {
        Row: {
          badge_code: string
          earned_at: string
          user_id: string
        }
        Insert: {
          badge_code: string
          earned_at?: string
          user_id: string
        }
        Update: {
          badge_code?: string
          earned_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "earned_badges_badge_code_fkey"
            columns: ["badge_code"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["code"]
          },
        ]
      }
      guest_players: {
        Row: {
          confirmed_at: string | null
          converted_to_user_id: string | null
          created_at: string | null
          email: string | null
          first_name: string
          id: string
          invited_by_user_id: string | null
          last_name: string
          league_id: string | null
          marketing_consent: boolean | null
        }
        Insert: {
          confirmed_at?: string | null
          converted_to_user_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          invited_by_user_id?: string | null
          last_name: string
          league_id?: string | null
          marketing_consent?: boolean | null
        }
        Update: {
          confirmed_at?: string | null
          converted_to_user_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          invited_by_user_id?: string | null
          last_name?: string
          league_id?: string | null
          marketing_consent?: boolean | null
        }
        Relationships: []
      }
      invitation_codes: {
        Row: {
          club_id: string
          code: string
          id: string
        }
        Insert: {
          club_id: string
          code: string
          id: string
        }
        Update: {
          club_id?: string
          code?: string
          id?: string
        }
        Relationships: []
      }
      league_memberships: {
        Row: {
          joined_at: string | null
          league_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string | null
          league_id: string
          user_id: string
        }
        Update: {
          joined_at?: string | null
          league_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "suggested_pairs"
            referencedColumns: ["player1_id"]
          },
          {
            foreignKeyName: "league_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "suggested_pairs"
            referencedColumns: ["player2_id"]
          },
          {
            foreignKeyName: "league_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "suggested_partners"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "league_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "suggested_partners"
            referencedColumns: ["player_id"]
          },
        ]
      }
      league_phase_history: {
        Row: {
          created_at: string
          division: number
          id: string
          league_id: string
          matches_played: number
          phase_number: number
          player_id: string
          points: number
          rank: number
        }
        Insert: {
          created_at?: string
          division: number
          id?: string
          league_id: string
          matches_played?: number
          phase_number: number
          player_id: string
          points?: number
          rank: number
        }
        Update: {
          created_at?: string
          division?: number
          id?: string
          league_id?: string
          matches_played?: number
          phase_number?: number
          player_id?: string
          points?: number
          rank?: number
        }
        Relationships: [
          {
            foreignKeyName: "league_phase_history_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      league_players: {
        Row: {
          division: number
          id: string
          joined_at: string
          league_id: string
          matches_played: number
          player_id: string
          points: number
        }
        Insert: {
          division?: number
          id?: string
          joined_at?: string
          league_id: string
          matches_played?: number
          player_id: string
          points?: number
        }
        Update: {
          division?: number
          id?: string
          joined_at?: string
          league_id?: string
          matches_played?: number
          player_id?: string
          points?: number
        }
        Relationships: [
          {
            foreignKeyName: "league_players_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          created_at: string
          created_by: string
          current_phase: number
          duration_weeks: number
          ends_at: string | null
          format: string
          id: string
          invite_code: string
          max_matches_per_player: number
          max_players: number
          name: string
          phase_ends_at: string | null
          starts_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          created_by: string
          current_phase?: number
          duration_weeks: number
          ends_at?: string | null
          format?: string
          id?: string
          invite_code: string
          max_matches_per_player: number
          max_players: number
          name: string
          phase_ends_at?: string | null
          starts_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          current_phase?: number
          duration_weeks?: number
          ends_at?: string | null
          format?: string
          id?: string
          invite_code?: string
          max_matches_per_player?: number
          max_players?: number
          name?: string
          phase_ends_at?: string | null
          starts_at?: string | null
          status?: string
        }
        Relationships: []
      }
      match_confirmations: {
        Row: {
          confirmation_token: string
          confirmed: boolean | null
          confirmed_at: string | null
          created_at: string | null
          guest_player_id: string | null
          id: string
          match_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          confirmation_token?: string
          confirmed?: boolean | null
          confirmed_at?: string | null
          created_at?: string | null
          guest_player_id?: string | null
          id?: string
          match_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          confirmation_token?: string
          confirmed?: boolean | null
          confirmed_at?: string | null
          created_at?: string | null
          guest_player_id?: string | null
          id?: string
          match_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_confirmations_guest_player_id_fkey"
            columns: ["guest_player_id"]
            isOneToOne: false
            referencedRelation: "guest_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_confirmations_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_invitations: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          message: string | null
          receiver_id: string
          responded_at: string | null
          sender_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          message?: string | null
          receiver_id: string
          responded_at?: string | null
          sender_id: string
          status?: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          message?: string | null
          receiver_id?: string
          responded_at?: string | null
          sender_id?: string
          status?: string
        }
        Relationships: []
      }
      match_participants: {
        Row: {
          guest_player_id: string | null
          level_after: number | null
          level_before: number | null
          level_change: number | null
          match_id: string
          player_type: string | null
          team: number
          user_id: string
        }
        Insert: {
          guest_player_id?: string | null
          level_after?: number | null
          level_before?: number | null
          level_change?: number | null
          match_id: string
          player_type?: string | null
          team: number
          user_id: string
        }
        Update: {
          guest_player_id?: string | null
          level_after?: number | null
          level_before?: number | null
          level_change?: number | null
          match_id?: string
          player_type?: string | null
          team?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_participants_guest_player_id_fkey"
            columns: ["guest_player_id"]
            isOneToOne: false
            referencedRelation: "guest_players"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          confirmed_at: string | null
          created_at: string | null
          decided_by_tiebreak: boolean
          id: string
          is_registered_club: boolean | null
          league_id: string | null
          location_club_id: string | null
          opponent_phone_hash: string | null
          opponent_type: string | null
          played_at: string | null
          players_hash: string | null
          score_details: string | null
          score_team1: number | null
          score_team2: number | null
          status: string | null
          team1_id: string
          team2_id: string
          validation_token: string | null
          winner_team_id: string | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string | null
          decided_by_tiebreak?: boolean
          id?: string
          is_registered_club?: boolean | null
          league_id?: string | null
          location_club_id?: string | null
          opponent_phone_hash?: string | null
          opponent_type?: string | null
          played_at?: string | null
          players_hash?: string | null
          score_details?: string | null
          score_team1?: number | null
          score_team2?: number | null
          status?: string | null
          team1_id: string
          team2_id: string
          validation_token?: string | null
          winner_team_id?: string | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string | null
          decided_by_tiebreak?: boolean
          id?: string
          is_registered_club?: boolean | null
          league_id?: string | null
          location_club_id?: string | null
          opponent_phone_hash?: string | null
          opponent_type?: string | null
          played_at?: string | null
          players_hash?: string | null
          score_details?: string | null
          score_team1?: number | null
          score_team2?: number | null
          status?: string | null
          team1_id?: string
          team2_id?: string
          validation_token?: string | null
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          is_admin: boolean | null
          sender_id: string
          type: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          sender_id: string
          type?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          sender_id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "admin_conversations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json
          id: string
          is_read: boolean | null
          message: string | null
          read: boolean | null
          title: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data: Json
          id?: string
          is_read?: boolean | null
          message?: string | null
          read?: boolean | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json
          id?: string
          is_read?: boolean | null
          message?: string | null
          read?: boolean | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      player_boost_credits: {
        Row: {
          consumed_at: string | null
          created_at: string
          created_by_session_id: string | null
          id: string
          stripe_payment_intent_id: string | null
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          created_by_session_id?: string | null
          id?: string
          stripe_payment_intent_id?: string | null
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          created_by_session_id?: string | null
          id?: string
          stripe_payment_intent_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      player_boost_uses: {
        Row: {
          applied_at: string
          boost_credit_id: string
          id: string
          match_id: string
          percentage: number
          points_after_boost: number
          points_before_boost: number
          user_id: string
        }
        Insert: {
          applied_at?: string
          boost_credit_id: string
          id?: string
          match_id: string
          percentage?: number
          points_after_boost: number
          points_before_boost: number
          user_id: string
        }
        Update: {
          applied_at?: string
          boost_credit_id?: string
          id?: string
          match_id?: string
          percentage?: number
          points_after_boost?: number
          points_before_boost?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_boost_uses_boost_credit_id_fkey"
            columns: ["boost_credit_id"]
            isOneToOne: false
            referencedRelation: "player_boost_credits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_boost_uses_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      player_partnerships: {
        Row: {
          created_at: string | null
          id: string
          partner_id: string
          player_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          partner_id: string
          player_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          partner_id?: string
          player_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      player_preferences: {
        Row: {
          created_at: string | null
          id: string
          looking_for_partner: boolean | null
          play_style: string | null
          player_id: string
          preferred_frequency: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          looking_for_partner?: boolean | null
          play_style?: string | null
          player_id: string
          preferred_frequency?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          looking_for_partner?: boolean | null
          play_style?: string | null
          player_id?: string
          preferred_frequency?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      player_stats: {
        Row: {
          defaites: number | null
          id: string
          parties_jouees: number | null
          player_id: string
          points: number | null
          updated_at: string | null
          victoires: number | null
        }
        Insert: {
          defaites?: number | null
          id?: string
          parties_jouees?: number | null
          player_id: string
          points?: number | null
          updated_at?: string | null
          victoires?: number | null
        }
        Update: {
          defaites?: number | null
          id?: string
          parties_jouees?: number | null
          player_id?: string
          points?: number | null
          updated_at?: string | null
          victoires?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "suggested_pairs"
            referencedColumns: ["player1_id"]
          },
          {
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "suggested_pairs"
            referencedColumns: ["player2_id"]
          },
          {
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "suggested_partners"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "suggested_partners"
            referencedColumns: ["player_id"]
          },
        ]
      }
      players: {
        Row: {
          club_id: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          losses: number | null
          password: string
          wins: number | null
        }
        Insert: {
          club_id?: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          losses?: number | null
          password: string
          wins?: number | null
        }
        Update: {
          club_id?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          losses?: number | null
          password?: string
          wins?: number | null
        }
        Relationships: []
      }
      pool_tiebreaks: {
        Row: {
          calculations: Json | null
          created_at: string | null
          final_ranking: Json
          id: string
          pool_id: string
          resolution_method: string
          resolution_step: number
          teams_involved: string[]
        }
        Insert: {
          calculations?: Json | null
          created_at?: string | null
          final_ranking: Json
          id?: string
          pool_id: string
          resolution_method: string
          resolution_step: number
          teams_involved: string[]
        }
        Update: {
          calculations?: Json | null
          created_at?: string | null
          final_ranking?: Json
          id?: string
          pool_id?: string
          resolution_method?: string
          resolution_step?: number
          teams_involved?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "pool_tiebreaks_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "tournament_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          best_shot: string | null
          city: string | null
          club_id: string | null
          club_slug: string | null
          created_at: string | null
          department_code: string | null
          display_name: string
          email: string | null
          first_name: string | null
          frequency: string | null
          full_name: string | null
          global_points: number | null
          hand: string | null
          has_completed_onboarding: boolean | null
          id: string
          is_admin: boolean | null
          is_ghost: boolean | null
          is_premium: boolean | null
          last_name: string | null
          level: string | null
          match_limit_info_understood: boolean | null
          matchs_joues: number | null
          niveau_breakdown: Json | null
          niveau_categorie: string | null
          niveau_padel: number | null
          niveau_recommendations: string[] | null
          phone_consent_at: string | null
          phone_consent_version: string | null
          phone_hash: string | null
          phone_number: string | null
          points: number
          postal_code: string | null
          preferred_side: string | null
          premium_until: string | null
          questionnaire_progress: Json | null
          referral_code: string | null
          referral_count: number | null
          region_code: string | null
          theme_preference: string | null
          updated_at: string | null
          username: string | null
          whatsapp_enabled: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          best_shot?: string | null
          city?: string | null
          club_id?: string | null
          club_slug?: string | null
          created_at?: string | null
          department_code?: string | null
          display_name: string
          email?: string | null
          first_name?: string | null
          frequency?: string | null
          full_name?: string | null
          global_points?: number | null
          hand?: string | null
          has_completed_onboarding?: boolean | null
          id: string
          is_admin?: boolean | null
          is_ghost?: boolean | null
          is_premium?: boolean | null
          last_name?: string | null
          level?: string | null
          match_limit_info_understood?: boolean | null
          matchs_joues?: number | null
          niveau_breakdown?: Json | null
          niveau_categorie?: string | null
          niveau_padel?: number | null
          niveau_recommendations?: string[] | null
          phone_consent_at?: string | null
          phone_consent_version?: string | null
          phone_hash?: string | null
          phone_number?: string | null
          points?: number
          postal_code?: string | null
          preferred_side?: string | null
          premium_until?: string | null
          questionnaire_progress?: Json | null
          referral_code?: string | null
          referral_count?: number | null
          region_code?: string | null
          theme_preference?: string | null
          updated_at?: string | null
          username?: string | null
          whatsapp_enabled?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          best_shot?: string | null
          city?: string | null
          club_id?: string | null
          club_slug?: string | null
          created_at?: string | null
          department_code?: string | null
          display_name?: string
          email?: string | null
          first_name?: string | null
          frequency?: string | null
          full_name?: string | null
          global_points?: number | null
          hand?: string | null
          has_completed_onboarding?: boolean | null
          id?: string
          is_admin?: boolean | null
          is_ghost?: boolean | null
          is_premium?: boolean | null
          last_name?: string | null
          level?: string | null
          match_limit_info_understood?: boolean | null
          matchs_joues?: number | null
          niveau_breakdown?: Json | null
          niveau_categorie?: string | null
          niveau_padel?: number | null
          niveau_recommendations?: string[] | null
          phone_consent_at?: string | null
          phone_consent_version?: string | null
          phone_hash?: string | null
          phone_number?: string | null
          points?: number
          postal_code?: string | null
          preferred_side?: string | null
          premium_until?: string | null
          questionnaire_progress?: Json | null
          referral_code?: string | null
          referral_count?: number | null
          region_code?: string | null
          theme_preference?: string | null
          updated_at?: string | null
          username?: string | null
          whatsapp_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          active: boolean | null
          code: string
          created_at: string | null
          offer_type: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string | null
          offer_type: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string | null
          offer_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string | null
          id: string
          platform: string
          token: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          platform: string
          token: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          platform?: string
          token?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "suggested_pairs"
            referencedColumns: ["player1_id"]
          },
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "suggested_pairs"
            referencedColumns: ["player2_id"]
          },
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "suggested_partners"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "suggested_partners"
            referencedColumns: ["player_id"]
          },
        ]
      }
      rankings: {
        Row: {
          last_updated: string
          league_id: string
          losses: number
          matches: number
          points: number
          user_id: string
          wins: number
        }
        Insert: {
          last_updated?: string
          league_id: string
          losses?: number
          matches?: number
          points?: number
          user_id: string
          wins?: number
        }
        Update: {
          last_updated?: string
          league_id?: string
          losses?: number
          matches?: number
          points?: number
          user_id?: string
          wins?: number
        }
        Relationships: []
      }
      ratings: {
        Row: {
          club_id: string | null
          comment: string | null
          id: string
          rated_id: string | null
          rater_id: string | null
          rating: number | null
        }
        Insert: {
          club_id?: string | null
          comment?: string | null
          id: string
          rated_id?: string | null
          rater_id?: string | null
          rating?: number | null
        }
        Update: {
          club_id?: string | null
          comment?: string | null
          id?: string
          rated_id?: string | null
          rater_id?: string | null
          rating?: number | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referral_code_used: string
          referred_boost_awarded: boolean | null
          referred_id: string
          referred_premium_awarded: boolean | null
          referrer_boost_awarded: boolean | null
          referrer_id: string
          referrer_premium_awarded: boolean | null
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code_used: string
          referred_boost_awarded?: boolean | null
          referred_id: string
          referred_premium_awarded?: boolean | null
          referrer_boost_awarded?: boolean | null
          referrer_id: string
          referrer_premium_awarded?: boolean | null
        }
        Update: {
          created_at?: string
          id?: string
          referral_code_used?: string
          referred_boost_awarded?: boolean | null
          referred_id?: string
          referred_premium_awarded?: boolean | null
          referrer_boost_awarded?: boolean | null
          referrer_id?: string
          referrer_premium_awarded?: boolean | null
        }
        Relationships: []
      }
      reservation_participants: {
        Row: {
          amount: number | null
          created_at: string | null
          id: string
          is_organizer: boolean | null
          paid_at: string | null
          payment_status: string | null
          reservation_id: string
          stripe_payment_intent_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          id?: string
          is_organizer?: boolean | null
          paid_at?: string | null
          payment_status?: string | null
          reservation_id: string
          stripe_payment_intent_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          id?: string
          is_organizer?: boolean | null
          paid_at?: string | null
          payment_status?: string | null
          reservation_id?: string
          stripe_payment_intent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_participants_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          court_id: string
          created_at: string | null
          created_by: string
          end_time: string
          expires_at: string | null
          id: string
          payment_method: string | null
          start_time: string
          status: string | null
          title: string | null
          total_price: number | null
          updated_at: string | null
        }
        Insert: {
          court_id: string
          created_at?: string | null
          created_by: string
          end_time: string
          expires_at?: string | null
          id?: string
          payment_method?: string | null
          start_time: string
          status?: string | null
          title?: string | null
          total_price?: number | null
          updated_at?: string | null
        }
        Update: {
          court_id?: string
          created_at?: string | null
          created_by?: string
          end_time?: string
          expires_at?: string | null
          id?: string
          payment_method?: string | null
          start_time?: string
          status?: string | null
          title?: string | null
          total_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_created_by_profiles_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_created_by_profiles_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "suggested_pairs"
            referencedColumns: ["player1_id"]
          },
          {
            foreignKeyName: "reservations_created_by_profiles_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "suggested_pairs"
            referencedColumns: ["player2_id"]
          },
          {
            foreignKeyName: "reservations_created_by_profiles_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "suggested_partners"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "reservations_created_by_profiles_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "suggested_partners"
            referencedColumns: ["player_id"]
          },
        ]
      }
      review_conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          review_id: string
          status: string | null
          subject: string | null
          updated_at: string | null
          user_email: string
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          review_id: string
          status?: string | null
          subject?: string | null
          updated_at?: string | null
          user_email: string
          user_id: string
          user_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          review_id?: string
          status?: string | null
          subject?: string | null
          updated_at?: string | null
          user_email?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_conversations_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_messages: {
        Row: {
          conversation_id: string
          created_at: string | null
          email_message_id: string | null
          html_content: string | null
          id: string
          message_text: string
          sender_email: string
          sender_id: string | null
          sender_type: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          email_message_id?: string | null
          html_content?: string | null
          id?: string
          message_text: string
          sender_email: string
          sender_id?: string | null
          sender_type: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          email_message_id?: string | null
          html_content?: string | null
          id?: string
          message_text?: string
          sender_email?: string
          sender_id?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "review_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          is_hidden: boolean
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_events: {
        Row: {
          created_at: string | null
          event_type: string
          from_status: string | null
          id: string
          metadata: Json | null
          subscription_id: string
          to_status: string | null
          triggered_by: string | null
          triggered_by_user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          from_status?: string | null
          id?: string
          metadata?: Json | null
          subscription_id: string
          to_status?: string | null
          triggered_by?: string | null
          triggered_by_user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          from_status?: string | null
          id?: string
          metadata?: Json | null
          subscription_id?: string
          to_status?: string | null
          triggered_by?: string | null
          triggered_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_notifications: {
        Row: {
          id: string
          metadata: Json | null
          notification_type: string
          sent_at: string | null
          sent_to_email: string
          subscription_id: string
        }
        Insert: {
          id?: string
          metadata?: Json | null
          notification_type: string
          sent_at?: string | null
          sent_to_email: string
          subscription_id: string
        }
        Update: {
          id?: string
          metadata?: Json | null
          notification_type?: string
          sent_at?: string | null
          sent_to_email?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_notifications_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          auto_activate_at_trial_end: boolean | null
          billing_address: Json | null
          billing_email: string | null
          cancel_at_period_end: boolean | null
          club_id: string
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          grace_until: string | null
          has_payment_method: boolean | null
          id: string
          legal_name: string | null
          metadata: Json | null
          next_renewal_at: string | null
          payment_method_brand: string | null
          payment_method_expiry: string | null
          payment_method_id: string | null
          payment_method_last4: string | null
          payment_method_type: string | null
          plan_cycle: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end_at: string | null
          trial_start_at: string | null
          updated_at: string | null
          vat_number: string | null
        }
        Insert: {
          auto_activate_at_trial_end?: boolean | null
          billing_address?: Json | null
          billing_email?: string | null
          cancel_at_period_end?: boolean | null
          club_id: string
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          grace_until?: string | null
          has_payment_method?: boolean | null
          id?: string
          legal_name?: string | null
          metadata?: Json | null
          next_renewal_at?: string | null
          payment_method_brand?: string | null
          payment_method_expiry?: string | null
          payment_method_id?: string | null
          payment_method_last4?: string | null
          payment_method_type?: string | null
          plan_cycle?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end_at?: string | null
          trial_start_at?: string | null
          updated_at?: string | null
          vat_number?: string | null
        }
        Update: {
          auto_activate_at_trial_end?: boolean | null
          billing_address?: Json | null
          billing_email?: string | null
          cancel_at_period_end?: boolean | null
          club_id?: string
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          grace_until?: string | null
          has_payment_method?: boolean | null
          id?: string
          legal_name?: string | null
          metadata?: Json | null
          next_renewal_at?: string | null
          payment_method_brand?: string | null
          payment_method_expiry?: string | null
          payment_method_id?: string | null
          payment_method_last4?: string | null
          payment_method_type?: string | null
          plan_cycle?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end_at?: string | null
          trial_start_at?: string | null
          updated_at?: string | null
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: true
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      support_conversations: {
        Row: {
          club_id: string
          club_name: string
          created_at: string | null
          id: string
          last_message_at: string | null
          status: string | null
          subject: string | null
          updated_at: string | null
          user_email: string
          user_id: string
        }
        Insert: {
          club_id: string
          club_name: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          status?: string | null
          subject?: string | null
          updated_at?: string | null
          user_email: string
          user_id: string
        }
        Update: {
          club_id?: string
          club_name?: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          status?: string | null
          subject?: string | null
          updated_at?: string | null
          user_email?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_conversations_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          conversation_id: string
          created_at: string | null
          email_message_id: string | null
          html_content: string | null
          id: string
          message_text: string
          sender_email: string
          sender_id: string | null
          sender_type: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          email_message_id?: string | null
          html_content?: string | null
          id?: string
          message_text: string
          sender_email: string
          sender_id?: string | null
          sender_type: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          email_message_id?: string | null
          html_content?: string | null
          id?: string
          message_text?: string
          sender_email?: string
          sender_id?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_challenges: {
        Row: {
          challenger_player_1_id: string
          challenger_player_2_id: string
          created_at: string | null
          defender_1_status: string | null
          defender_2_status: string | null
          defender_player_1_id: string
          defender_player_2_id: string
          expires_at: string | null
          id: string
          status: string | null
        }
        Insert: {
          challenger_player_1_id: string
          challenger_player_2_id: string
          created_at?: string | null
          defender_1_status?: string | null
          defender_2_status?: string | null
          defender_player_1_id: string
          defender_player_2_id: string
          expires_at?: string | null
          id?: string
          status?: string | null
        }
        Update: {
          challenger_player_1_id?: string
          challenger_player_2_id?: string
          created_at?: string | null
          defender_1_status?: string | null
          defender_2_status?: string | null
          defender_player_1_id?: string
          defender_player_2_id?: string
          expires_at?: string | null
          id?: string
          status?: string | null
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          player1_id: string
          player2_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string | null
          player1_id: string
          player2_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          player1_id?: string
          player2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "suggested_pairs"
            referencedColumns: ["player1_id"]
          },
          {
            foreignKeyName: "teams_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "suggested_pairs"
            referencedColumns: ["player2_id"]
          },
          {
            foreignKeyName: "teams_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "suggested_partners"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "teams_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "suggested_partners"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "teams_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "suggested_pairs"
            referencedColumns: ["player1_id"]
          },
          {
            foreignKeyName: "teams_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "suggested_pairs"
            referencedColumns: ["player2_id"]
          },
          {
            foreignKeyName: "teams_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "suggested_partners"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "teams_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "suggested_partners"
            referencedColumns: ["player_id"]
          },
        ]
      }
      tournament_matches: {
        Row: {
          actual_end_time: string | null
          actual_start_time: string | null
          court_number: number | null
          created_at: string | null
          forfait_team_id: string | null
          forfait_type: string | null
          id: string
          is_bye: boolean | null
          match_order: number | null
          next_match_id: string | null
          next_match_position: string | null
          pool_id: string | null
          round_number: number | null
          round_type: string
          scheduled_time: string | null
          score: Json | null
          status: string
          tableau: string | null
          team1_registration_id: string | null
          team2_registration_id: string | null
          tournament_id: string
          updated_at: string | null
          winner_registration_id: string | null
        }
        Insert: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          court_number?: number | null
          created_at?: string | null
          forfait_team_id?: string | null
          forfait_type?: string | null
          id?: string
          is_bye?: boolean | null
          match_order?: number | null
          next_match_id?: string | null
          next_match_position?: string | null
          pool_id?: string | null
          round_number?: number | null
          round_type: string
          scheduled_time?: string | null
          score?: Json | null
          status?: string
          tableau?: string | null
          team1_registration_id?: string | null
          team2_registration_id?: string | null
          tournament_id: string
          updated_at?: string | null
          winner_registration_id?: string | null
        }
        Update: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          court_number?: number | null
          created_at?: string | null
          forfait_team_id?: string | null
          forfait_type?: string | null
          id?: string
          is_bye?: boolean | null
          match_order?: number | null
          next_match_id?: string | null
          next_match_position?: string | null
          pool_id?: string | null
          round_number?: number | null
          round_type?: string
          scheduled_time?: string | null
          score?: Json | null
          status?: string
          tableau?: string | null
          team1_registration_id?: string | null
          team2_registration_id?: string | null
          tournament_id?: string
          updated_at?: string | null
          winner_registration_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_forfait_team_id_fkey"
            columns: ["forfait_team_id"]
            isOneToOne: false
            referencedRelation: "tournament_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_next_match_id_fkey"
            columns: ["next_match_id"]
            isOneToOne: false
            referencedRelation: "tournament_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "tournament_pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_team1_registration_id_fkey"
            columns: ["team1_registration_id"]
            isOneToOne: false
            referencedRelation: "tournament_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_team2_registration_id_fkey"
            columns: ["team2_registration_id"]
            isOneToOne: false
            referencedRelation: "tournament_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_winner_registration_id_fkey"
            columns: ["winner_registration_id"]
            isOneToOne: false
            referencedRelation: "tournament_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_participants: {
        Row: {
          created_at: string | null
          current_ranking: number | null
          final_ranking: number | null
          games_lost: number | null
          games_won: number | null
          id: string
          matches_lost: number | null
          matches_played: number | null
          matches_won: number | null
          partner_license: string | null
          partner_name: string | null
          player_id: string
          player_license: string | null
          status: string
          total_points: number | null
          tournament_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_ranking?: number | null
          final_ranking?: number | null
          games_lost?: number | null
          games_won?: number | null
          id?: string
          matches_lost?: number | null
          matches_played?: number | null
          matches_won?: number | null
          partner_license?: string | null
          partner_name?: string | null
          player_id: string
          player_license?: string | null
          status?: string
          total_points?: number | null
          tournament_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_ranking?: number | null
          final_ranking?: number | null
          games_lost?: number | null
          games_won?: number | null
          id?: string
          matches_lost?: number | null
          matches_played?: number | null
          matches_won?: number | null
          partner_license?: string | null
          partner_name?: string | null
          player_id?: string
          player_license?: string | null
          status?: string
          total_points?: number | null
          tournament_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_participants_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_participants_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "suggested_pairs"
            referencedColumns: ["player1_id"]
          },
          {
            foreignKeyName: "tournament_participants_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "suggested_pairs"
            referencedColumns: ["player2_id"]
          },
          {
            foreignKeyName: "tournament_participants_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "suggested_partners"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "tournament_participants_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "suggested_partners"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "tournament_participants_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_pools: {
        Row: {
          completed_at: string | null
          created_at: string | null
          format: string
          id: string
          num_teams: number
          pool_number: number
          pool_type: string
          status: string
          tournament_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          format: string
          id?: string
          num_teams: number
          pool_number: number
          pool_type: string
          status?: string
          tournament_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          format?: string
          id?: string
          num_teams?: number
          pool_number?: number
          pool_type?: string
          status?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_pools_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_registrations: {
        Row: {
          amount_paid: number | null
          change_approved: boolean | null
          change_justification_file: string | null
          change_reason: string | null
          created_at: string | null
          disciplinary_points: number | null
          final_ranking: number | null
          forfait_date: string | null
          forfait_type: string | null
          id: string
          is_bye: boolean | null
          is_seed: boolean | null
          is_wild_card: boolean | null
          medical_certificate_url: string | null
          original_player1_id: string | null
          original_player2_id: string | null
          paid_at: string | null
          pair_total_rank: number | null
          pair_weight: number
          payment_status: string
          phase: string
          player1_classification: string | null
          player1_id: string
          player1_name: string | null
          player1_rank: number | null
          player2_classification: string | null
          player2_id: string
          player2_name: string | null
          player2_rank: number | null
          pool_id: string | null
          registration_order: number
          rejection_reason: string | null
          seed_number: number | null
          status: string
          stripe_payment_intent_id: string | null
          tournament_id: string
          updated_at: string | null
        }
        Insert: {
          amount_paid?: number | null
          change_approved?: boolean | null
          change_justification_file?: string | null
          change_reason?: string | null
          created_at?: string | null
          disciplinary_points?: number | null
          final_ranking?: number | null
          forfait_date?: string | null
          forfait_type?: string | null
          id?: string
          is_bye?: boolean | null
          is_seed?: boolean | null
          is_wild_card?: boolean | null
          medical_certificate_url?: string | null
          original_player1_id?: string | null
          original_player2_id?: string | null
          paid_at?: string | null
          pair_total_rank?: number | null
          pair_weight: number
          payment_status?: string
          phase?: string
          player1_classification?: string | null
          player1_id: string
          player1_name?: string | null
          player1_rank?: number | null
          player2_classification?: string | null
          player2_id: string
          player2_name?: string | null
          player2_rank?: number | null
          pool_id?: string | null
          registration_order: number
          rejection_reason?: string | null
          seed_number?: number | null
          status?: string
          stripe_payment_intent_id?: string | null
          tournament_id: string
          updated_at?: string | null
        }
        Update: {
          amount_paid?: number | null
          change_approved?: boolean | null
          change_justification_file?: string | null
          change_reason?: string | null
          created_at?: string | null
          disciplinary_points?: number | null
          final_ranking?: number | null
          forfait_date?: string | null
          forfait_type?: string | null
          id?: string
          is_bye?: boolean | null
          is_seed?: boolean | null
          is_wild_card?: boolean | null
          medical_certificate_url?: string | null
          original_player1_id?: string | null
          original_player2_id?: string | null
          paid_at?: string | null
          pair_total_rank?: number | null
          pair_weight?: number
          payment_status?: string
          phase?: string
          player1_classification?: string | null
          player1_id?: string
          player1_name?: string | null
          player1_rank?: number | null
          player2_classification?: string | null
          player2_id?: string
          player2_name?: string | null
          player2_rank?: number | null
          pool_id?: string | null
          registration_order?: number
          rejection_reason?: string | null
          seed_number?: number | null
          status?: string
          stripe_payment_intent_id?: string | null
          tournament_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registrations_original_player1_id_fkey"
            columns: ["original_player1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_original_player1_id_fkey"
            columns: ["original_player1_id"]
            isOneToOne: false
            referencedRelation: "suggested_pairs"
            referencedColumns: ["player1_id"]
          },
          {
            foreignKeyName: "tournament_registrations_original_player1_id_fkey"
            columns: ["original_player1_id"]
            isOneToOne: false
            referencedRelation: "suggested_pairs"
            referencedColumns: ["player2_id"]
          },
          {
            foreignKeyName: "tournament_registrations_original_player1_id_fkey"
            columns: ["original_player1_id"]
            isOneToOne: false
            referencedRelation: "suggested_partners"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "tournament_registrations_original_player1_id_fkey"
            columns: ["original_player1_id"]
            isOneToOne: false
            referencedRelation: "suggested_partners"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "tournament_registrations_original_player2_id_fkey"
            columns: ["original_player2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_original_player2_id_fkey"
            columns: ["original_player2_id"]
            isOneToOne: false
            referencedRelation: "suggested_pairs"
            referencedColumns: ["player1_id"]
          },
          {
            foreignKeyName: "tournament_registrations_original_player2_id_fkey"
            columns: ["original_player2_id"]
            isOneToOne: false
            referencedRelation: "suggested_pairs"
            referencedColumns: ["player2_id"]
          },
          {
            foreignKeyName: "tournament_registrations_original_player2_id_fkey"
            columns: ["original_player2_id"]
            isOneToOne: false
            referencedRelation: "suggested_partners"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "tournament_registrations_original_player2_id_fkey"
            columns: ["original_player2_id"]
            isOneToOne: false
            referencedRelation: "suggested_partners"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "tournament_registrations_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "suggested_pairs"
            referencedColumns: ["player1_id"]
          },
          {
            foreignKeyName: "tournament_registrations_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "suggested_pairs"
            referencedColumns: ["player2_id"]
          },
          {
            foreignKeyName: "tournament_registrations_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "suggested_partners"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "tournament_registrations_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "suggested_partners"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "tournament_registrations_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "suggested_pairs"
            referencedColumns: ["player1_id"]
          },
          {
            foreignKeyName: "tournament_registrations_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "suggested_pairs"
            referencedColumns: ["player2_id"]
          },
          {
            foreignKeyName: "tournament_registrations_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "suggested_partners"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "tournament_registrations_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "suggested_partners"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "tournament_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          available_courts: number[] | null
          category: string
          club_id: string
          coaching_allowed: boolean | null
          created_at: string | null
          created_by: string | null
          description: string | null
          draw_publication_date: string | null
          end_date: string
          has_third_place: boolean
          id: string
          inscription_fee: number
          main_draw_size: number | null
          match_duration_minutes: number | null
          match_format: string
          max_teams: number | null
          name: string
          num_pools: number | null
          num_seeds: number | null
          num_wild_cards: number | null
          pool_format: string | null
          pool_size: number | null
          prize_money: Json | null
          punto_de_oro: boolean | null
          registration_close_date: string
          registration_open_date: string
          start_date: string
          status: string
          stripe_product_id: string | null
          tournament_type: string
          updated_at: string | null
        }
        Insert: {
          available_courts?: number[] | null
          category: string
          club_id: string
          coaching_allowed?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          draw_publication_date?: string | null
          end_date: string
          has_third_place?: boolean
          id?: string
          inscription_fee: number
          main_draw_size?: number | null
          match_duration_minutes?: number | null
          match_format: string
          max_teams?: number | null
          name: string
          num_pools?: number | null
          num_seeds?: number | null
          num_wild_cards?: number | null
          pool_format?: string | null
          pool_size?: number | null
          prize_money?: Json | null
          punto_de_oro?: boolean | null
          registration_close_date: string
          registration_open_date: string
          start_date: string
          status?: string
          stripe_product_id?: string | null
          tournament_type: string
          updated_at?: string | null
        }
        Update: {
          available_courts?: number[] | null
          category?: string
          club_id?: string
          coaching_allowed?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          draw_publication_date?: string | null
          end_date?: string
          has_third_place?: boolean
          id?: string
          inscription_fee?: number
          main_draw_size?: number | null
          match_duration_minutes?: number | null
          match_format?: string
          max_teams?: number | null
          name?: string
          num_pools?: number | null
          num_seeds?: number | null
          num_wild_cards?: number | null
          pool_format?: string | null
          pool_size?: number | null
          prize_money?: Json | null
          punto_de_oro?: boolean | null
          registration_close_date?: string
          registration_open_date?: string
          start_date?: string
          status?: string
          stripe_product_id?: string | null
          tournament_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "suggested_pairs"
            referencedColumns: ["player1_id"]
          },
          {
            foreignKeyName: "tournaments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "suggested_pairs"
            referencedColumns: ["player2_id"]
          },
          {
            foreignKeyName: "tournaments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "suggested_partners"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "tournaments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "suggested_partners"
            referencedColumns: ["player_id"]
          },
        ]
      }
      unregistered_clubs: {
        Row: {
          address: string | null
          city: string
          created_at: string
          created_by_user_id: string | null
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city: string
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unregistered_clubs_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unregistered_clubs_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "suggested_pairs"
            referencedColumns: ["player1_id"]
          },
          {
            foreignKeyName: "unregistered_clubs_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "suggested_pairs"
            referencedColumns: ["player2_id"]
          },
          {
            foreignKeyName: "unregistered_clubs_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "suggested_partners"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "unregistered_clubs_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "suggested_partners"
            referencedColumns: ["player_id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_key: string
          achievement_type: string
          id: string
          metadata: Json | null
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_key: string
          achievement_type: string
          id?: string
          metadata?: Json | null
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_key?: string
          achievement_type?: string
          id?: string
          metadata?: Json | null
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_clubs: {
        Row: {
          club_id: string
          club_points: number
          created_at: string
          id: string
          joined_at: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          club_id: string
          club_points?: number
          created_at?: string
          id?: string
          joined_at?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          club_id?: string
          club_points?: number
          created_at?: string
          id?: string
          joined_at?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_clubs_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_clubs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_clubs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "suggested_pairs"
            referencedColumns: ["player1_id"]
          },
          {
            foreignKeyName: "user_clubs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "suggested_pairs"
            referencedColumns: ["player2_id"]
          },
          {
            foreignKeyName: "user_clubs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "suggested_partners"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "user_clubs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "suggested_partners"
            referencedColumns: ["player_id"]
          },
        ]
      }
    }
    Views: {
      admin_club_conversations_view: {
        Row: {
          club_id: string | null
          club_logo_url: string | null
          club_name: string | null
          created_at: string | null
          id: string | null
          is_read_by_admin: boolean | null
          last_message_at: string | null
          last_message_preview: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_conversations_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: true
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_conversations_view: {
        Row: {
          avatar_url: string | null
          club_id: string | null
          club_name: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string | null
          is_read_by_admin: boolean | null
          last_message_at: string | null
          last_message_preview: string | null
          last_name: string | null
          status: string | null
          user_id: string | null
        }
        Relationships: []
      }
      leaderboard: {
        Row: {
          losses: number | null
          matches: number | null
          name: string | null
          player_name: string | null
          points: number | null
          tier: string | null
          user_id: string | null
          wins: number | null
        }
        Relationships: []
      }
      suggested_pairs: {
        Row: {
          club_id: string | null
          compatibility_score: number | null
          pair_avg_level: number | null
          pair_avg_winrate: number | null
          player1_avatar: string | null
          player1_first_name: string | null
          player1_id: string | null
          player1_last_name: string | null
          player1_level: number | null
          player1_winrate: number | null
          player2_avatar: string | null
          player2_first_name: string | null
          player2_id: string | null
          player2_last_name: string | null
          player2_level: number | null
          player2_winrate: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      suggested_partners: {
        Row: {
          compatibility_score: number | null
          pair_avg_level: number | null
          pair_avg_winrate: number | null
          partner_avatar: string | null
          partner_first_name: string | null
          partner_id: string | null
          partner_last_name: string | null
          partner_level: number | null
          partner_winrate: number | null
          player_avatar: string | null
          player_first_name: string | null
          player_id: string | null
          player_last_name: string | null
          player_level: number | null
          player_winrate: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_and_notify_expiring_challenges: { Args: never; Returns: undefined }
      check_is_club_admin:
        | { Args: { club_id_to_check: string }; Returns: boolean }
        | {
            Args: { lookup_club_id: string; lookup_user_id: string }
            Returns: boolean
          }
      check_player_suspension: {
        Args: { p_player_id: string }
        Returns: {
          is_suspended: boolean
          suspension_end: string
          total_points: number
        }[]
      }
      cleanup_old_notifications: { Args: never; Returns: undefined }
      count_player_boost_credits_available: {
        Args: { p_user_id: string }
        Returns: number
      }
      count_player_boosts_used_this_month: {
        Args: { p_user_id: string }
        Returns: number
      }
      count_words: { Args: { text_value: string }; Returns: number }
      expire_old_match_invitations: { Args: never; Returns: undefined }
      expire_unpaid_reservations: { Args: never; Returns: undefined }
      find_or_create_player: {
        Args: { player_name: string }
        Returns: {
          display_name: string
          email: string
          id: string
          was_created: boolean
        }[]
      }
      find_player_by_name: {
        Args: { player_name: string }
        Returns: {
          display_name: string
          email: string
          id: string
        }[]
      }
      generate_referral_code: { Args: never; Returns: string }
      generate_unique_username: {
        Args: { p_first_name: string; p_last_name: string }
        Returns: string
      }
      get_partner_phone: {
        Args: { partner_uuid: string }
        Returns: {
          phone: string
          whatsapp_enabled: boolean
        }[]
      }
      get_top3: {
        Args: never
        Returns: {
          defaites: number
          id: string
          ligue: string
          nom: string
          parties: number
          points: number
          rank_position: number
          victoires: number
        }[]
      }
      get_user_auth_info: {
        Args: { user_id_param: string }
        Returns: {
          email: string
          email_confirmed_at: string
          encrypted_password: string
          last_sign_in_at: string
          user_id: string
        }[]
      }
      increment_club_dashboard_login_count: {
        Args: { p_club_id: string }
        Returns: undefined
      }
      increment_club_invitations_sent_count: {
        Args: { p_club_id: string }
        Returns: undefined
      }
      increment_club_points: {
        Args: { p_club_id: string; p_points: number; p_user_id: string }
        Returns: undefined
      }
      increment_global_points: {
        Args: { p_points: number; p_user_id: string }
        Returns: undefined
      }
      initialize_club_subscription: {
        Args: { p_club_id: string }
        Returns: string
      }
      mark_expired_invitations: { Args: never; Returns: undefined }
      mark_expired_team_challenges: { Args: never; Returns: undefined }
      set_looking_for_partner: {
        Args: { looking: boolean }
        Returns: undefined
      }
      transition_subscription_status: {
        Args: {
          p_metadata?: Json
          p_new_status: string
          p_subscription_id: string
          p_triggered_by?: string
          p_triggered_by_user_id?: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
